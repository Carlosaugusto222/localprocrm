# Atendente WhatsApp com IA — Meta Cloud API + Lovable AI

Você escolheu WhatsApp oficial (Meta) e Lovable AI Gateway, e não tem n8n. **Boa notícia:** para o seu caso, n8n é dispensável — o LocalPro já tem servidor (TanStack), banco (Supabase) e gateway de IA. Vou implementar o atendente direto no sistema, mais rápido, mais barato e sem mais uma ferramenta pra manter.

> Se mais tarde quiser n8n para orquestrar fluxos visuais (ex.: integrar com Google Calendar, planilhas, e-mail marketing), a gente pluga depois — a arquitetura abaixo já expõe endpoints reutilizáveis.

## O que o atendente vai fazer

- Recebe mensagens do cliente no WhatsApp Business oficial.
- Identifica o cliente pelo número (cria no CRM se for novo).
- Responde com IA (Gemini via Lovable AI Gateway) usando contexto da empresa: serviços, preços, horários, agenda.
- Agenda horários consultando `business_hours` + `appointments` e cria o registro.
- Escala pra humano quando detecta intenção complexa (reclamação, valor alto, palavra-chave configurável).
- Guarda toda conversa em `wa_messages` pra você ver o histórico no painel.

## Arquitetura (sem n8n)

```text
Cliente WhatsApp
      │
      ▼
Meta WhatsApp Cloud API ──webhook──▶ /api/public/wa/webhook  (TanStack server route)
                                          │
                                          ├─▶ Supabase (customers, wa_messages, appointments)
                                          ├─▶ Lovable AI Gateway (Gemini + tool calling)
                                          └─▶ Meta Graph API (envia resposta)
```

## Implementação

### 1. Banco (migração)
- `wa_channels` — credenciais por organização: `phone_number_id`, `waba_id`, `access_token` (criptografado), `verify_token`, `app_secret`, `enabled`, `auto_reply`, `escalation_keywords[]`.
- `wa_conversations` — uma por cliente: `customer_id`, `last_message_at`, `status` (bot/human/closed), `assigned_to`.
- `wa_messages` — `conversation_id`, `direction` (in/out), `wa_message_id`, `type`, `text`, `media_url`, `ai_used`, `created_at`.
- RLS por organização + GRANTs padrão.

### 2. Webhook público (`src/routes/api/public/wa/webhook.ts`)
- `GET` — verificação do Meta (`hub.challenge`).
- `POST` — valida assinatura `X-Hub-Signature-256` (HMAC-SHA256 com `app_secret`), encontra a org pelo `phone_number_id`, grava a mensagem, dispara o agente.
- Resposta 200 imediata; processamento async.

### 3. Agente IA (`src/lib/wa-agent.server.ts`)
- Carrega contexto: org, serviços/produtos, `business_hours`, próximos horários livres, últimos 10 turnos da conversa.
- Chama Gemini com **tool calling**:
  - `listar_servicos()` 
  - `consultar_horarios_disponiveis(data)`
  - `agendar(servico_id, data, hora, nome)`
  - `obter_endereco_horario_funcionamento()`
  - `escalar_humano(motivo)`
- Envia resposta via Graph API (`/messages`).

### 4. Painel de configuração (`/whatsapp/config`)
- Formulário pra colar `Phone Number ID`, `WABA ID`, `Access Token`, `App Secret`.
- Mostra a URL do webhook + Verify Token pra colar no painel Meta.
- Toggle: auto-resposta ligada/desligada, horário de atendimento, palavras de escalação.
- Botão "Enviar mensagem de teste".

### 5. Caixa de entrada (`/whatsapp/inbox`)
- Lista conversas (não lidas em destaque), filtro bot/humano.
- Painel de chat: histórico + caixa pra responder manualmente (assume controle → vira `human`, IA pausa).
- Botão "devolver pra IA".

## O que VOCÊ precisa fazer no Meta (uma vez, ~15 min)

1. Criar app em https://developers.facebook.com → produto **WhatsApp**.
2. Pegar `Phone Number ID`, `WhatsApp Business Account ID`, gerar `Access Token permanente` (System User) e copiar o `App Secret`.
3. No painel, configurar webhook apontando para `https://localprocrm.lovable.app/api/public/wa/webhook` + colar o Verify Token que eu vou gerar.
4. Inscrever nos eventos `messages`.

Eu te guio passo a passo no painel `/whatsapp/config` depois que estiver pronto.

## Custos
- **Lovable AI Gateway**: cobrança por requisição (Gemini Flash é o mais barato — uso normal de atendimento fica em centavos por conversa).
- **Meta WhatsApp**: 1000 conversas iniciadas por usuário/mês grátis; depois, tarifa por categoria (utilidade, marketing, serviço). Conversas iniciadas pelo cliente em janela de 24h são grátis.

## Fora do escopo desta entrega
- Disparo em massa / campanhas com templates aprovados (fica pra Fase 2).
- Mídia (áudio/imagem) — só texto neste primeiro corte.
- Multi-atendente com roteamento por fila (fica pra Fase 2).

Posso implementar?
