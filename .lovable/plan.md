# Fase 3 — LocalPro CRM Profissional e Adaptável

Objetivo: transformar o sistema em uma plataforma de gestão completa, pronta para qualquer segmento, com tudo que falta para um SaaS sério.

## 1. Onboarding inteligente por segmento
- Wizard em 4 passos no primeiro login: dados da empresa, segmento, módulos ativos, importar catálogo sugerido (serviços/produtos pré-prontos por segmento).
- 7 templates: Barbearia, Salão, Clínica, Oficina, Restaurante, Academia, Imobiliária + Genérico.
- Cria automaticamente: catálogo inicial, tags padrão de cliente, status do funil customizados.

## 2. Ordens de Serviço (módulo novo — `/os`)
- Essencial para oficinas, clínicas, assistências, prestadores.
- Numeração sequencial por empresa, status (Aberta, Em execução, Aguardando peça, Concluída, Entregue, Cancelada).
- Vincula cliente + técnico responsável + itens (peças/serviços) + checklist + fotos antes/depois (upload no Storage).
- Geração automática de venda + transação ao concluir.

## 3. Catálogo profissional
- Estoque: quantidade atual, mínimo, alerta de baixo estoque.
- Categorias, SKU, código de barras, custo vs preço (margem calculada).
- Movimento de estoque automático em vendas + OS.

## 4. Caixa diário e formas de pagamento
- Abertura/fechamento de caixa com saldo inicial e contagem final.
- Formas de pagamento: dinheiro, pix, débito, crédito (com parcelas), boleto, transferência.
- Conciliação por forma de pagamento no fechamento.
- Centros de custo e categorias de despesa.

## 5. Comissões de funcionários
- Tabela de comissão por funcionário/serviço (% ou valor fixo).
- Relatório de comissões a pagar por período.
- Atribuir profissional responsável em agendamento, OS e venda.

## 6. Agenda profissional
- Horários de funcionamento por dia da semana + bloqueios (feriados, almoço).
- Múltiplos profissionais com agenda independente, visão por profissional.
- Conflito de horário bloqueado, duração padrão por serviço.
- Lembretes automáticos (estrutura) 24h e 1h antes.

## 7. Notificações in-app
- Sino no topbar com central de notificações: novos agendamentos, baixo estoque, OS aguardando, contas a vencer, aniversários de clientes.
- Tabela `notifications` com lida/não lida e link de ação.

## 8. Portal do Cliente (link público)
- Página pública `/agendar/{slug-empresa}` para cliente agendar sozinho escolhendo serviço + profissional + horário.
- Sem login, cria cliente automaticamente, gera agendamento pendente de confirmação.

## 9. Documentos e contratos
- Geração de PDF profissional para: orçamento, OS, recibo, contrato simples.
- Cabeçalho com logo da empresa + dados fiscais.

## 10. Configurações da empresa expandidas
- Upload de logo (Storage), endereço completo, CNPJ, telefone, horário de atendimento.
- Configuração fiscal básica (regime tributário).
- Convidar funcionários por email com papel (owner/staff) e módulos permitidos.

## 11. Auditoria e segurança
- Tabela `audit_log` registrando ações sensíveis (exclusões, alterações financeiras, mudanças de plano).
- Política de retenção (super admin vê tudo, owner vê só da empresa).

## 12. Aniversariantes e fidelização
- Widget de aniversariantes do mês no Hoje.
- Programa de fidelidade simples: pontos por venda, regaste em desconto.

## 13. Dashboard refinado
- Comparativo com período anterior (% crescimento).
- Top 5 clientes, top 5 serviços, ocupação da agenda.
- Filtro de período (hoje/semana/mês/ano).

## 14. IA com contexto real
- Assistente passa a ter acesso ao contexto da empresa (segmento, métricas) para respostas específicas.
- Nova ação: "Sugerir promoção para hoje" baseada em ocupação da agenda.

## Detalhes técnicos
- Novas tabelas: `service_orders`, `service_order_items`, `stock_movements`, `cash_sessions`, `payment_methods`, `commissions`, `notifications`, `business_hours`, `loyalty_points`, `audit_log`, `invitations`.
- Bucket Storage `org-assets` (logos, fotos OS) com RLS por organização.
- Todas as tabelas com GRANTs + RLS via `is_org_member`.
- Novas rotas: `/onboarding`, `/os`, `/os/$id`, `/caixa`, `/equipe`, `/agendar/$slug` (pública).
- Sidebar reorganizada com novos itens em Dia a dia/Gestão.

## O que NÃO entra nessa fase (deixar pra depois se quiser)
- Pagamento real Stripe/Paddle (só estrutura de planos).
- WhatsApp real (Twilio/Meta) — fica como estrutura.
- App mobile nativo.
- NF-e/NFC-e fiscal real (depende de integração externa).

Vou implementar em ordem de impacto: onboarding → OS → estoque → caixa+pagamentos → comissões → agenda pro → notificações → portal cliente → docs PDF → config expandida → auditoria → fidelização → dashboard → IA contextual.

Confirma que posso seguir com tudo isso de uma vez? É grande mas vai ficar redondo.