-- A no-argument function used by the keepalive cloud function to touch the
-- PostgreSQL engine every few minutes. Any query resets the idle timer so the
-- managed instance is never auto-suspended (which previously wiped the tables).

CREATE OR REPLACE FUNCTION public.ping_db()
RETURNS int LANGUAGE sql STABLE AS $$
  SELECT 1;
$$;

GRANT EXECUTE ON FUNCTION public.ping_db() TO anon, authenticated;
