DO $$ 
BEGIN
  -- 1) Revogar execução pública de funções críticas que ainda possam ter acesso broad
  REVOKE EXECUTE ON FUNCTION public.has_role(UUID, public.app_role) FROM PUBLIC, anon;
  REVOKE EXECUTE ON FUNCTION public.is_org_member(UUID) FROM PUBLIC, anon;
  REVOKE EXECUTE ON FUNCTION public.is_org_owner(UUID) FROM PUBLIC, anon;
  REVOKE EXECUTE ON FUNCTION public.create_invitation(UUID, TEXT, TEXT, TEXT[]) FROM PUBLIC, anon;
  REVOKE EXECUTE ON FUNCTION public.accept_invitation(TEXT) FROM PUBLIC, anon;

  -- 2) Garantir que tabelas sensíveis tenham RLS e GRANTs corretos
  -- Já feito nas migrações, mas reforçando auditoria
  ALTER TABLE IF EXISTS public.audit_log ENABLE ROW LEVEL SECURITY;
  ALTER TABLE IF EXISTS public.user_roles ENABLE ROW LEVEL SECURITY;
  
  -- 3) Limpar qualquer política broad residual (exemplo hipotético se existisse)
  -- DROP POLICY IF EXISTS "public_read" ON public.audit_log;

  -- 4) Garantir que o super_admin não tenha acesso de escrita em tabelas de negócio via RLS broad
  -- Isso já foi tratado na migração restrict_super_admin.sql
END $$;