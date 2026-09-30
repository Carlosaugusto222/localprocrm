import { createServerFn } from '@tanstack/react-start';
import { requireSupabaseAuth } from '@/integrations/supabase/auth-middleware';
import { z } from 'zod';

const orgInput = z.object({ organizationId: z.string().uuid() });
const originInput = z.object({ organizationId: z.string().uuid(), originId: z.string().uuid(), kind: z.enum(['nfce', 'nfse']) });

async function authorize(context: { supabase: any; userId: string }, organizationId: string, owner = false) {
  const { data, error } = await context.supabase.from('organization_members').select('role,active')
    .eq('organization_id', organizationId).eq('user_id', context.userId).maybeSingle();
  if (error || !data || data.active === false || (owner && data.role !== 'owner')) throw new Error('Sem permissão para esta empresa.');
}

function responseStatus(body: Record<string, any>) {
  const status = String(body.status || '').toLowerCase();
  return status === 'autorizado' ? 'authorized' : status.includes('process') ? 'processing' : 'rejected';
}
function fiscalLinks(body: Record<string, any>, base: string) {
  const link = (value: unknown) => {
    if (typeof value !== 'string' || !value) return null;
    const url = new URL(value, base);
    return url.protocol === 'https:' && (url.hostname === 'focusnfe.com.br' || url.hostname.endsWith('.focusnfe.com.br')) ? url.toString() : null;
  };
  return { xml_url: link(body.caminho_xml_nota_fiscal ?? body.caminho_xml_nota), pdf_url: link(body.caminho_danfe ?? body.url) };
}
async function providerRequest(config: { provider_token: string; environment: string }, kind: string, reference: string, method: 'GET' | 'POST', payload?: object) {
  const base = config.environment === 'production' ? 'https://api.focusnfe.com.br/v2/' : 'https://homologacao.focusnfe.com.br/v2/';
  const url = new URL(`${kind}${method === 'GET' ? `/${reference}` : ''}`, base);
  if (method === 'POST') url.searchParams.set('ref', reference);
  const result = await fetch(url, {
    method, headers: { Authorization: `Basic ${btoa(`${config.provider_token}:`)}`, 'Content-Type': 'application/json' },
    ...(payload ? { body: JSON.stringify(payload) } : {}), signal: AbortSignal.timeout(25000),
  });
  const body = await result.json().catch(() => ({})) as Record<string, any>;
  return { ok: result.ok, body, base };
}

export const getFiscalSettings = createServerFn({ method: 'POST' }).middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => orgInput.parse(data))
  .handler(async ({ data, context }) => {
    await authorize(context, data.organizationId, true);
    const { supabaseAdmin } = await import('@/integrations/supabase/client.server');
    const { data: config } = await supabaseAdmin.from('fiscal_configs').select('environment,accountant_approved,approved_at,municipal_registration,municipality_code,simple_national,service_code,service_tax_rate,service_iss_withheld,service_nature,provider_token')
      .eq('organization_id', data.organizationId).maybeSingle();
    if (!config) return null;
    const { provider_token, ...safe } = config;
    return { ...safe, has_token: !!provider_token };
  });

const settingsInput = orgInput.extend({
  token: z.string().trim().optional(), environment: z.enum(['homologation', 'production']), accountant_approved: z.boolean(),
  municipal_registration: z.string().trim().optional(), municipality_code: z.string().trim().optional(),
  simple_national: z.boolean().nullable(), service_code: z.string().trim().optional(), service_tax_rate: z.number().nullable(),
  service_iss_withheld: z.boolean(), service_nature: z.string().trim().optional(),
});
export const saveFiscalSettings = createServerFn({ method: 'POST' }).middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => settingsInput.parse(data))
  .handler(async ({ data, context }) => {
    await authorize(context, data.organizationId, true);
    const { supabaseAdmin } = await import('@/integrations/supabase/client.server');
    const { data: old } = await supabaseAdmin.from('fiscal_configs').select('accountant_approved,environment').eq('organization_id', data.organizationId).maybeSingle();
    if (data.environment === 'production' && !data.accountant_approved) throw new Error('A produção exige aprovação do contador.');
    const { token, organizationId, ...fields } = data;
    const { error } = await supabaseAdmin.from('fiscal_configs').upsert({
      ...fields, organization_id: organizationId, ...(token ? { provider_token: token } : {}),
      approved_at: data.accountant_approved ? (old?.accountant_approved ? undefined : new Date().toISOString()) : null,
    });
    if (error) throw new Error('Não foi possível salvar a configuração fiscal.');
    return { ok: true };
  });

export const issueFiscalDocument = createServerFn({ method: 'POST' }).middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => originInput.parse(data))
  .handler(async ({ data, context }) => {
    await authorize(context, data.organizationId);
    const { supabaseAdmin } = await import('@/integrations/supabase/client.server');
    const { data: config } = await supabaseAdmin.from('fiscal_configs').select('*').eq('organization_id', data.organizationId).maybeSingle();
    if (!config?.provider_token) throw new Error('Configure o token Focus NFe em Configurações → Fiscal.');
    if (config.environment === 'production' && !config.accountant_approved) throw new Error('Emissão em produção bloqueada até a validação do contador.');
    const sourceColumn = data.kind === 'nfce' ? 'sale_id' : 'service_order_id';
    const { data: previous } = await supabaseAdmin.from('fiscal_documents').select('*').eq('organization_id', data.organizationId).eq(sourceColumn, data.originId).maybeSingle();
    if (previous?.status === 'authorized' || previous?.status === 'processing' || previous?.status === 'pending') return { document: previous, message: 'Nota já enviada. Consulte o status antes de tentar novamente.' };
    const { data: org } = await context.supabase.from('organizations').select('cnpj').eq('id', data.organizationId).single();
    if (!org?.cnpj || org.cnpj.replace(/\D/g, '').length !== 14) throw new Error('Informe o CNPJ da empresa em Configurações.');
    const reference = previous?.reference ?? `${data.kind}-${data.originId}`;
    let payload: Record<string, any>;
    if (data.kind === 'nfce') {
      const { data: sale } = await context.supabase.from('sales').select('id,total,status,payment_method,discount').eq('id', data.originId).eq('organization_id', data.organizationId).single();
      if (!sale || sale.status !== 'paid') throw new Error('A venda deve estar paga para emitir NFC-e.');
      const { data: lines } = await context.supabase.from('sale_items').select('description,quantity,unit_price,subtotal,product_id,products(sku,fiscal_ncm,fiscal_cfop,fiscal_icms_origin,fiscal_icms_cst,fiscal_unit,kind)').eq('sale_id', sale.id);
      if (!lines?.length) throw new Error('A venda não possui itens.');
      if (lines.some((line: any) => line.products?.kind === 'service')) throw new Error('A NFC-e não pode conter serviços. Separe os serviços para NFS-e.');
      const payment: Record<string, string> = { cash: '01', credit: '03', debit: '04', pix: '17', boleto: '15', transfer: '18' };
      if (!payment[sale.payment_method ?? '']) throw new Error('Forma de pagamento incompatível com emissão fiscal.');
      const items = lines.map((line: any, index: number) => {
        const p = line.products;
        if (!p?.sku || !p.fiscal_ncm || !p.fiscal_cfop || !p.fiscal_icms_origin || !p.fiscal_icms_cst) throw new Error(`Complete SKU, NCM, CFOP, origem e CST/CSOSN de ${line.description} no Estoque.`);
        return { numero_item: String(index + 1), codigo_produto: p.sku, descricao: line.description, codigo_ncm: p.fiscal_ncm, cfop: p.fiscal_cfop,
          quantidade_comercial: Number(line.quantity), quantidade_tributavel: Number(line.quantity), unidade_comercial: p.fiscal_unit || 'UN', unidade_tributavel: p.fiscal_unit || 'UN',
          valor_unitario_comercial: Number(line.unit_price), valor_unitario_tributavel: Number(line.unit_price), valor_bruto: Number(line.subtotal), icms_origem: p.fiscal_icms_origin, icms_situacao_tributaria: p.fiscal_icms_cst };
      });
      const gross = items.reduce((sum: number, item: any) => sum + item.valor_bruto, 0);
      const deduction = Math.round((gross - Number(sale.total)) * 100) / 100;
      if (deduction < -0.01 || deduction > gross) throw new Error('Total da venda não confere com os itens.');
      if (deduction > 0) items[items.length - 1].valor_desconto = deduction;
      payload = { cnpj_emitente: org.cnpj.replace(/\D/g, ''), data_emissao: new Date().toISOString(), presenca_comprador: '1', modalidade_frete: '9', local_destino: '1', natureza_operacao: 'VENDA AO CONSUMIDOR', items,
        formas_pagamento: [{ forma_pagamento: payment[sale.payment_method ?? ''], valor_pagamento: Number(sale.total) }] };
    } else {
      const { data: os } = await context.supabase.from('service_orders').select('id,number,status,customer_id').eq('id', data.originId).eq('organization_id', data.organizationId).single();
      if (!os || !['done', 'delivered'].includes(os.status)) throw new Error('Conclua a OS antes de emitir NFS-e.');
      const { data: lines } = await context.supabase.from('service_order_items').select('description,total,product_id,products(kind)').eq('service_order_id', os.id);
      if (!lines?.length || lines.some((line: any) => line.products?.kind !== 'service')) throw new Error('A NFS-e deve conter somente serviços cadastrados. Separe peças e produtos para documento fiscal próprio.');
      const { data: customer } = await context.supabase.from('customers').select('name,document,email').eq('id', os.customer_id ?? '').eq('organization_id', data.organizationId).maybeSingle();
      const document = customer?.document?.replace(/\D/g, '') ?? '';
      if (![11, 14].includes(document.length)) throw new Error('Informe CPF ou CNPJ do cliente no cadastro.');
      if (!config.municipal_registration || !/^\d{7}$/.test(config.municipality_code ?? '') || !config.service_code || config.simple_national === null || !config.service_nature) throw new Error('Complete inscrição municipal, código IBGE, código de serviço, regime e natureza da operação em Configurações → Fiscal.');
      payload = { data_emissao: new Date().toISOString(), natureza_operacao: config.service_nature, optante_simples_nacional: config.simple_national,
        prestador: { cnpj: org.cnpj.replace(/\D/g, ''), inscricao_municipal: config.municipal_registration, codigo_municipio: config.municipality_code },
        tomador: { [document.length === 11 ? 'cpf' : 'cnpj']: document, razao_social: customer?.name, ...(customer?.email ? { email: customer.email } : {}) },
        servico: { valor_servicos: lines.reduce((sum: number, line: any) => sum + Number(line.total ?? 0), 0), iss_retido: config.service_iss_withheld,
          item_lista_servico: config.service_code, codigo_municipio: config.municipality_code, discriminacao: `OS #${os.number}: ${lines.map((line: any) => line.description).join('; ')}`,
          ...(config.service_tax_rate != null ? { aliquota: Number(config.service_tax_rate) } : {}) } };
    }
    // A stable reference prevents accidental duplicate issuance on retry.
    const { data: row, error: insertError } = previous ? { data: previous, error: null } : await supabaseAdmin.from('fiscal_documents').insert({ organization_id: data.organizationId, [sourceColumn]: data.originId, kind: data.kind, reference, environment: config.environment, status: 'pending' }).select().single();
    if (insertError || !row) throw new Error('Não foi possível reservar esta emissão. Consulte o histórico antes de repetir.');
    try {
      // If a previous attempt was inconclusive, consult first rather than transmit twice.
      if (previous) {
        const checked = await providerRequest(config, data.kind, reference, 'GET');
        if (checked.ok && checked.body.status !== 'erro') return await persist(checked, row.id, supabaseAdmin);
      }
      const sent = await providerRequest(config, data.kind, reference, 'POST', payload);
      return await persist(sent, row.id, supabaseAdmin);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Falha de comunicação';
      await supabaseAdmin.from('fiscal_documents').update({ status: 'pending', error_message: `Não foi possível confirmar a transmissão: ${message}. Consulte antes de reenviar.` }).eq('id', row.id);
      throw new Error('Não foi possível confirmar a transmissão. Consulte o status antes de reenviar.');
    }
  });

async function persist(result: { ok: boolean; body: Record<string, any>; base: string }, id: string, admin: any) {
  const { body, base } = result;
  const status = result.ok ? responseStatus(body) : 'rejected';
  const message = result.ok ? (body.mensagem_sefaz ?? body.mensagem ?? null) : (body.mensagem ?? body.correcao ?? 'Dados rejeitados pelo emissor fiscal.');
  const { data: document, error } = await admin.from('fiscal_documents').update({ status, number: body.numero ? String(body.numero) : null, access_key: body.chave_nfe ?? null,
    ...fiscalLinks(body, base), error_message: status === 'authorized' ? null : message }).eq('id', id).select().single();
  if (error) throw new Error('Falha ao registrar retorno fiscal. Consulte antes de repetir.');
  return { document, message: status === 'authorized' ? 'Nota autorizada.' : status === 'processing' ? 'Nota enviada; consulte o status em alguns instantes.' : message };
}

export const refreshFiscalDocument = createServerFn({ method: 'POST' }).middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => orgInput.extend({ documentId: z.string().uuid() }).parse(data))
  .handler(async ({ data, context }) => {
    await authorize(context, data.organizationId);
    const { supabaseAdmin } = await import('@/integrations/supabase/client.server');
    const { data: document } = await supabaseAdmin.from('fiscal_documents').select('*').eq('id', data.documentId).eq('organization_id', data.organizationId).single();
    if (!document) throw new Error('Nota não encontrada.');
    const { data: config } = await supabaseAdmin.from('fiscal_configs').select('provider_token,environment').eq('organization_id', data.organizationId).single();
    if (!config?.provider_token) throw new Error('Configure o token do emissor fiscal.');
    const checked = await providerRequest({ ...config, provider_token: config.provider_token }, document.kind, document.reference, 'GET');
    if (!checked.ok && checked.body.codigo !== 'nao_encontrado') throw new Error(checked.body.mensagem ?? 'Consulta indisponível. Tente novamente.');
    return persist(checked, document.id, supabaseAdmin);
  });
