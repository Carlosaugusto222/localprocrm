# Plano de Implementação: Auditoria de IA

Implementar o rastreamento e auditoria de todas as interações de IA (sugestões e campanhas) para garantir transparência, permitir ajustes baseados em dados e manter um histórico detalhado das decisões automatizadas.

## Alterações

### 1. Backend & Banco de Dados
- Utilizar a tabela `audit_log` existente para registrar as interações de IA.
- A tabela já suporta `organization_id`, `user_id`, `action`, `entity`, `entity_id` e `payload`.

### 2. Integração no Chat de IA
- Modificar o handler de `/api/chat` para registrar cada solicitação de chat no `audit_log`.
- Registrar o prompt do sistema (que inclui o contexto do tenant) e a consulta do usuário.

### 3. Integração nas Sugestões de WhatsApp
- Atualizar `suggestWaReply` em `src/lib/wa-ai.functions.ts` para registrar a sugestão gerada, o histórico da conversa e o contexto da empresa utilizado.

### 4. Memória do Projeto
- Criar `mem://features/ia-audit.md` para documentar o requisito de auditoria.
- Atualizar `mem://index.md` para incluir a referência à auditoria de IA.

## Detalhes Técnicos
- **Entidade de Auditoria**: `ia_interaction`
- **Ações**: `chat_completion`, `wa_suggestion`
- **Payload**: Incluirá `{ system_prompt, user_query, response, context_data }`
- **Privacidade**: Garantir que apenas usuários com permissões adequadas (via RLS existente na `audit_log`) possam visualizar esses logs.
