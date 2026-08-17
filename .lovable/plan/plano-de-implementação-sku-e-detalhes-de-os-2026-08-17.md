# Plano de Implementação: SKU e Detalhes de OS

Implementação da criação de SKU para produtos, peças e serviços, além de possibilitar a visualização e edição detalhada das Ordens de Serviço (OS) já criadas.

## Mudanças Propostas

### Backend e Banco de Dados
- **SKU em Produtos**: O campo `sku` já existe na tabela `products`. Garantiremos que ele seja exibido e editável.
- **Auditoria**: Reforçar os logs de auditoria para capturar alterações no SKU e nas edições de OS.

### Frontend e UI/UX
- **Visualização de OS**: Melhorar a lista de OS em `/os` para garantir que o clique no card leve ao detalhamento (`/os/$id`).
- **Edição de OS**: Em `/os/$id`, permitir a edição dos dados básicos da OS (título, descrição, cliente) diretamente na tela de detalhes.
- **SKU no Inventário**: Garantir que o SKU esteja em evidência na tela de estoque e no PDV.

## Detalhes Técnicos
- Utilizar a rota dinâmica `/os/$id` já existente para centralizar a visualização e edição.
- Implementar formulários inline ou diálogos de edição na página de detalhes da OS.
- Garantir que a seleção de itens na OS e no PDV mostre o SKU para facilitar a identificação.

## Próximos Passos
1. Validar a presença e funcionalidade do SKU em `src/routes/_authenticated/vendas.tsx`.
2. Refinar a página `src/routes/_authenticated/os.$id.tsx` para permitir edição completa da OS.
3. Testar o fluxo de "clicar para ver/editar" na listagem de OS.
