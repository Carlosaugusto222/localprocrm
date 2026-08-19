-- Hardening final das permissões de execução para evitar WARN 0029 do linter
-- Revogando acesso 'authenticated' de funções que só devem ser chamadas pelo sistema ou via triggers

REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.next_service_order_number(UUID) FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.touch_updated_at() FROM authenticated;

-- As funções de checagem de RLS (has_role, is_org_member, is_org_owner) precisam de EXECUTE para authenticated
-- pois são usadas nas cláusulas USING das políticas RLS que rodam no contexto do usuário.
-- As outras funções já tiveram seu acesso restrito.
