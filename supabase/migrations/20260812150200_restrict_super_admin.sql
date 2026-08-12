-- Restringir funções de segurança para super_admin
-- O super_admin não deve ser considerado membro ou dono automático para fins de RLS em tabelas de negócio

CREATE OR REPLACE FUNCTION public.is_org_member(_org_id UUID)
RETURNS BOOLEAN LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.organization_members
    WHERE organization_id = _org_id AND user_id = auth.uid()
  )
$$;

CREATE OR REPLACE FUNCTION public.is_org_owner(_org_id UUID)
RETURNS BOOLEAN LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.organization_members
    WHERE organization_id = _org_id AND user_id = auth.uid() AND role = 'owner'
  )
$$;

-- Garantir que o super_admin ainda possa ler organizações no painel de admin
-- As políticas de organizations já usam is_org_member, mas vamos adicionar uma específica para super_admin ler
DROP POLICY IF EXISTS "super_admin_read_all_orgs" ON public.organizations;
CREATE POLICY "super_admin_read_all_orgs" ON public.organizations
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'));

-- Permitir que super_admin atualize planos e delete orgs
DROP POLICY IF EXISTS "super_admin_manage_orgs" ON public.organizations;
CREATE POLICY "super_admin_manage_orgs" ON public.organizations
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'))
  WITH CHECK (public.has_role(auth.uid(), 'super_admin'));

