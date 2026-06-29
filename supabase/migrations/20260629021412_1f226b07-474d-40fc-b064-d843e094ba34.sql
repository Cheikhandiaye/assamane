
-- Allow public wrapper functions (SECURITY INVOKER) to call app_private.* helpers
GRANT USAGE ON SCHEMA app_private TO anon, authenticated, service_role;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA app_private TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA app_private GRANT EXECUTE ON FUNCTIONS TO anon, authenticated, service_role;
