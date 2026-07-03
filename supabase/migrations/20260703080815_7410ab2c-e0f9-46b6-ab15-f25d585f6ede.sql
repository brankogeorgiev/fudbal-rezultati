-- Move SECURITY DEFINER functions out of the API-exposed public schema so they
-- can no longer be invoked directly by anon/authenticated via the Data API,
-- while RLS policies and triggers keep working (they reference by OID).
CREATE SCHEMA IF NOT EXISTS private;

ALTER FUNCTION public.has_role(uuid, public.app_role) SET SCHEMA private;
ALTER FUNCTION public.handle_new_user_role() SET SCHEMA private;

-- Restrict execution: remove the implicit PUBLIC grant, then grant only to the
-- roles that actually need it (authenticated for RLS checks, service_role for admin).
REVOKE ALL ON FUNCTION private.has_role(uuid, public.app_role) FROM PUBLIC;
REVOKE ALL ON FUNCTION private.handle_new_user_role() FROM PUBLIC;

GRANT USAGE ON SCHEMA private TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION private.has_role(uuid, public.app_role) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION private.handle_new_user_role() TO service_role;