# LocalPro CRM — Plano de Construção

SaaS white-label multi-tenant para negócios locais. O escopo é grande; vou entregar em fases para que você veja valor a cada etapa e possa ajustar o rumo antes de investir em módulos pesados.

## Antes de começar — 3 decisões rápidas

1. **Backend**: vou ativar o **Lovable Cloud** (Postgres + Auth + Storage + Server Functions). Necessário para multi-tenant, RLS e papéis. OK?
2. **Idioma da UI**: Português (BR) como padrão. OK?
3. **Pagamentos de assinatura (Básico/Pro/Premium)**: deixo a estrutura de planos pronta no banco, mas **não** integro cobrança real agora (Stripe/Paddle entra numa fase posterior, requer Pro plan). Os planos funcionam como feature-flags por enquanto. OK?

## Fase 1 — Fundação (esta entrega)

Objetivo: app navegável, bonito, com auth, multi-tenant e o esqueleto de todos os módulos.

**Design system**
- Tokens em `src/styles.css` (oklch), dark/light mode, inspiração Stripe/Linear/Notion
- Tipografia premium (não-default), animações sutis, layout responsivo
- Sidebar colapsável + topbar com troca de tema e seletor de empresa

**Banco (Lovable Cloud)**
- `organizations` (tenant): nome, slug, plano, módulos ativos (jsonb), segmento
- `profiles`: dados do usuário
- `organization_members`: vínculo user↔org com papel (`owner`, `staff`)
- `user_roles` (app-wide): `super_admin` separado, via security-definer `has_role()`
- `customers`, `appointments`, `products`, `sales`, `sale_items`, `transactions` (receitas/despesas), `tags`, `customer_tags`
- RLS em tudo, isolada por `organization_id` via função `is_org_member(org_id)` security-definer
- GRANTs explícitos em todas as tabelas públicas
- Trigger de criação automática de profile + organização no signup

**Auth**
- Email/senha + Google (via broker Lovable)
- Recuperação de senha com rota `/reset-password`
- Verificação de email habilitada
- Layout `_authenticated` gerenciado redireciona não-logados para `/auth`

**Rotas (TanStack)**
```
/                       landing pública
/auth                   login + cadastro + recuperar
/reset-password         redefinir senha
/_authenticated/
  dashboard             cards + gráficos (recharts)
  crm                   lista de clientes, busca, tags, status
  crm/$id               detalhe + histórico + funil
  agenda                calendário dia/semana/mês (drag&drop)
  financeiro            receitas, despesas, fluxo de caixa
  vendas                produtos/serviços, pedidos, orçamentos
  whatsapp              placeholder "Em breve" + estrutura de templates
  ia                    chat com Lovable AI (Gemini Flash)
  relatorios            filtros + export CSV (PDF/XLSX em fase 2)
  configuracoes         empresa, módulos ativos, equipe, plano
/super-admin            métricas globais (gated por role)
```

**Módulos modulares**
- Tabela `organizations.enabled_modules jsonb` controla o que aparece na sidebar
- Hook `useEnabledModules()` lê do tenant atual; rotas escondidas se desativadas
- Pré-configurações por segmento (barbearia, clínica, oficina, etc.) ao criar empresa

**Funcionalidade real nesta fase**
- CRM: CRUD completo de clientes com tags, status, busca
- Agenda: calendário funcional (visualizações + criar/editar/arrastar)
- Financeiro: CRUD de transações + gráfico de fluxo de caixa
- Vendas: CRUD de produtos/serviços + criar pedido simples
- Dashboard: métricas reais agregadas do tenant
- IA: chat funcional usando Lovable AI
- Relatórios: tabelas filtráveis + export CSV
- Configurações: trocar plano, ativar/desativar módulos, convidar membro (gera link)

## Fase 2 — Refinamentos (próxima conversa)

- Funil de vendas Kanban com drag&drop
- Export PDF/XLSX (jsPDF + xlsx)
- Templates de WhatsApp + integração real (quando você tiver provedor)
- IA com ações: gerar campanha, resumir atendimento, criar relatório em linguagem natural
- Super Admin: dashboard global de todos os tenants
- Cobrança real (Stripe/Paddle) atrelada aos planos
- Notificações in-app + email (confirmações, lembretes)

## Detalhes técnicos

- Stack: TanStack Start + React 19 + TS strict + Tailwind v4 + shadcn/ui + Lovable Cloud (Supabase) + TanStack Query + recharts + date-fns + react-day-picker + Lovable AI Gateway (Gemini 3 Flash)
- Multi-tenant por **RLS + organization_id**, não por schema (mais simples, escalável até dezenas de milhares de tenants)
- Papéis: `super_admin` em `user_roles` (global), `owner`/`staff` em `organization_members` (por tenant)
- Server functions com `requireSupabaseAuth` para tudo que muta dados
- IA via `createServerFn` chamando AI Gateway server-side (chave nunca no client)

## Tamanho da entrega da Fase 1

Será grande (~40-50 arquivos novos). Vou priorizar **profundidade no design e no CRM/Agenda/Dashboard** (o que você mais vai mostrar) e deixar Financeiro/Vendas/IA funcionais mas mais enxutos, prontos para evoluir.

Confirma os 3 pontos no topo e mando ver?
