import { useEffect, useState } from 'react';
import { useServerFn } from '@tanstack/react-start';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { getFiscalSettings, saveFiscalSettings } from '@/lib/fiscal.functions';

export function FiscalSettings({ organizationId }: { organizationId: string }) {
  const load = useServerFn(getFiscalSettings);
  const save = useServerFn(saveFiscalSettings);
  const qc = useQueryClient();
  const { data } = useQuery({ queryKey: ['fiscal-settings', organizationId], queryFn: () => load({ data: { organizationId } }) });
  const [form, setForm] = useState({ token: '', environment: 'homologation' as 'homologation' | 'production', accountant_approved: false,
    municipal_registration: '', municipality_code: '', simple_national: null as boolean | null, service_code: '', service_tax_rate: '', service_iss_withheld: false, service_nature: '' });
  const [busy, setBusy] = useState(false);
  useEffect(() => { if (data) setForm(f => ({ ...f, environment: data.environment as 'homologation' | 'production', accountant_approved: data.accountant_approved,
    municipal_registration: data.municipal_registration ?? '', municipality_code: data.municipality_code ?? '', simple_national: data.simple_national,
    service_code: data.service_code ?? '', service_tax_rate: data.service_tax_rate == null ? '' : String(data.service_tax_rate),
    service_iss_withheld: data.service_iss_withheld, service_nature: data.service_nature ?? '' })); }, [data]);
  const field = (label: string, key: 'municipal_registration' | 'municipality_code' | 'service_code' | 'service_tax_rate' | 'service_nature', hint?: string) =>
    <div className="space-y-1"><Label htmlFor={key}>{label}</Label><Input id={key} value={form[key]} placeholder={hint} onChange={e => setForm({ ...form, [key]: e.target.value })} /></div>;
  return <div className="space-y-5 max-w-2xl py-4">
    <p className="text-sm text-muted-foreground">Emissão via Focus NFe. Configure a empresa e o certificado digital no emissor. Comece em homologação; a produção exige validação dos impostos e exigências municipais pelo contador.</p>
    <div className="space-y-1"><Label htmlFor="fiscal-token">Token Focus NFe</Label><Input id="fiscal-token" type="password" autoComplete="off" value={form.token} placeholder={data?.has_token ? 'Token salvo · deixe vazio para manter' : 'Token do ambiente selecionado'} onChange={e => setForm({ ...form, token: e.target.value })} /><p className="text-xs text-muted-foreground">Token protegido; nunca será exibido novamente.</p></div>
    <div className="grid sm:grid-cols-2 gap-3">
      {field('Inscrição municipal', 'municipal_registration')}
      {field('Município (código IBGE)', 'municipality_code', '7 dígitos')}
      {field('Item da lista de serviços (LC 116)', 'service_code')}
      {field('Natureza da operação', 'service_nature', 'Código validado pelo contador')}
      {field('Alíquota ISS (se exigida)', 'service_tax_rate')}
      <div className="space-y-1"><Label htmlFor="simples">Optante do Simples Nacional</Label><select id="simples" className="w-full h-9 border rounded-md bg-background px-2 text-sm" value={form.simple_national === null ? '' : String(form.simple_national)} onChange={e => setForm({ ...form, simple_national: e.target.value === '' ? null : e.target.value === 'true' })}><option value="">Não definido</option><option value="true">Sim</option><option value="false">Não</option></select></div>
    </div>
    <div className="flex items-center gap-3"><Switch id="iss-withheld" checked={form.service_iss_withheld} onCheckedChange={v => setForm({ ...form, service_iss_withheld: v })} /><Label htmlFor="iss-withheld">ISS retido</Label></div>
    <div className="border-t pt-4 space-y-3">
      <div className="flex items-center gap-3"><Switch id="approved" checked={form.accountant_approved} onCheckedChange={v => setForm({ ...form, accountant_approved: v, environment: v ? form.environment : 'homologation' })} /><Label htmlFor="approved">Confirmo que o contador validou impostos, códigos fiscais e regras da empresa e município</Label></div>
      <div className="space-y-1"><Label htmlFor="environment">Ambiente</Label><select id="environment" className="w-full h-9 border rounded-md bg-background px-2 text-sm" value={form.environment} onChange={e => setForm({ ...form, environment: e.target.value as 'homologation' | 'production' })}><option value="homologation">Homologação (teste)</option><option value="production" disabled={!form.accountant_approved}>Produção (emissão real)</option></select></div>
      <p className="text-xs text-muted-foreground">Ao mudar de ambiente, substitua o token pelo token correspondente. Confira certificado A1, CSC/ID CSC para NFC-e e habilitação municipal para NFS-e diretamente com o emissor.</p>
    </div>
    <Button disabled={busy} onClick={async () => { setBusy(true); try {
      await save({ data: { ...form, organizationId, service_tax_rate: form.service_tax_rate === '' ? null : Number(form.service_tax_rate) } });
      setForm(f => ({ ...f, token: '' })); await qc.invalidateQueries({ queryKey: ['fiscal-settings', organizationId] }); toast.success('Configuração fiscal salva');
    } catch (e) { toast.error(e instanceof Error ? e.message : 'Não foi possível salvar.'); } finally { setBusy(false); } }}>Salvar configuração fiscal</Button>
  </div>;
}
