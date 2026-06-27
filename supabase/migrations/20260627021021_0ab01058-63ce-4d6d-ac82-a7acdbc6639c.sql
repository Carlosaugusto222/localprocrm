
-- 1) organization_members: restrict self-write escalation
DROP POLICY IF EXISTS "members_owner_manage" ON public.organization_members;
CREATE POLICY "members_owner_insert" ON public.organization_members
  FOR INSERT TO authenticated WITH CHECK (public.is_org_owner(organization_id));
CREATE POLICY "members_owner_update" ON public.organization_members
  FOR UPDATE TO authenticated USING (public.is_org_owner(organization_id)) WITH CHECK (public.is_org_owner(organization_id));
CREATE POLICY "members_owner_delete" ON public.organization_members
  FOR DELETE TO authenticated USING (public.is_org_owner(organization_id));

-- 2) audit_log: NULL org rows only readable by super_admin
DROP POLICY IF EXISTS "Audit read members" ON public.audit_log;
CREATE POLICY "Audit read members" ON public.audit_log
  FOR SELECT TO authenticated
  USING (
    (organization_id IS NOT NULL AND public.is_org_member(organization_id))
    OR (organization_id IS NULL AND public.has_role(auth.uid(), 'super_admin'))
  );

-- 3) invitations: hash tokens at rest
ALTER TABLE public.invitations ADD COLUMN IF NOT EXISTS token_hash TEXT;
UPDATE public.invitations SET token_hash = encode(extensions.digest(token, 'sha256'), 'hex') WHERE token_hash IS NULL;
ALTER TABLE public.invitations ALTER COLUMN token_hash SET NOT NULL;
ALTER TABLE public.invitations DROP COLUMN token;
CREATE UNIQUE INDEX IF NOT EXISTS invitations_token_hash_key ON public.invitations(token_hash);

CREATE OR REPLACE FUNCTION public.create_invitation(_org_id UUID, _email TEXT, _role TEXT DEFAULT 'staff', _allowed_modules TEXT[] DEFAULT NULL)
RETURNS TABLE(id UUID, token TEXT)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, extensions
AS $$
DECLARE _token TEXT; _hash TEXT; _id UUID;
BEGIN
  IF NOT public.is_org_owner(_org_id) THEN RAISE EXCEPTION 'not authorized'; END IF;
  _token := encode(extensions.gen_random_bytes(24), 'hex');
  _hash := encode(extensions.digest(_token, 'sha256'), 'hex');
  INSERT INTO public.invitations(organization_id, email, role, allowed_modules, token_hash, invited_by)
  VALUES (_org_id, _email, _role, _allowed_modules, _hash, auth.uid())
  RETURNING invitations.id INTO _id;
  RETURN QUERY SELECT _id, _token;
END $$;
REVOKE EXECUTE ON FUNCTION public.create_invitation(UUID, TEXT, TEXT, TEXT[]) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_invitation(UUID, TEXT, TEXT, TEXT[]) TO authenticated;

CREATE OR REPLACE FUNCTION public.accept_invitation(_token TEXT)
RETURNS UUID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, extensions
AS $$
DECLARE _hash TEXT; _inv RECORD; _uid UUID := auth.uid(); _email TEXT;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'auth required'; END IF;
  _hash := encode(extensions.digest(_token, 'sha256'), 'hex');
  SELECT * INTO _inv FROM public.invitations WHERE token_hash = _hash AND accepted_at IS NULL AND expires_at > now();
  IF NOT FOUND THEN RAISE EXCEPTION 'invalid or expired invitation'; END IF;
  SELECT email INTO _email FROM auth.users WHERE id = _uid;
  IF lower(_email) <> lower(_inv.email) THEN RAISE EXCEPTION 'invitation email mismatch'; END IF;
  INSERT INTO public.organization_members(organization_id, user_id, role, allowed_modules)
  VALUES (_inv.organization_id, _uid, _inv.role, _inv.allowed_modules)
  ON CONFLICT DO NOTHING;
  UPDATE public.invitations SET accepted_at = now() WHERE id = _inv.id;
  RETURN _inv.organization_id;
END $$;
REVOKE EXECUTE ON FUNCTION public.accept_invitation(TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.accept_invitation(TEXT) TO authenticated;

-- 4) Lock down internal SECURITY DEFINER functions
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.next_service_order_number(UUID) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.touch_updated_at() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.has_role(UUID, public.app_role) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.is_org_member(UUID) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.is_org_owner(UUID) FROM PUBLIC, anon;

-- 5) Storage org-assets: drop broad listing policy
DROP POLICY IF EXISTS "org-assets public read" ON storage.objects;
CREATE POLICY "org-assets members read" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'org-assets' AND public.is_org_member(((storage.foldername(name))[1])::uuid));
