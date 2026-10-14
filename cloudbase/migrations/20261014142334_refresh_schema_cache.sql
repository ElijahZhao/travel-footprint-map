-- Recreate core checkins table, RLS policies and the get_travel_stats RPC.
-- The live PostgreSQL instance lost these objects (idle auto-suspend wiped data),
-- which is why every REST call returned "Could not find the table in the schema cache".

CREATE TABLE IF NOT EXISTS public.checkins (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id TEXT NOT NULL DEFAULT auth.uid(),
  place_name TEXT NOT NULL,
  address TEXT,
  lng DOUBLE PRECISION NOT NULL,
  lat DOUBLE PRECISION NOT NULL,
  category TEXT NOT NULL DEFAULT 'scenery',
  status TEXT NOT NULL DEFAULT 'visited',
  visit_date DATE,
  mood_text TEXT,
  tags TEXT[] DEFAULT '{}',
  photos JSONB DEFAULT '[]',
  rating INTEGER CHECK (rating BETWEEN 1 AND 5),
  is_public BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_checkins_user ON public.checkins(user_id);
CREATE INDEX IF NOT EXISTS idx_checkins_status ON public.checkins(status);

ALTER TABLE public.checkins ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS select_own ON public.checkins;
DROP POLICY IF EXISTS insert_own ON public.checkins;
DROP POLICY IF EXISTS update_own ON public.checkins;
DROP POLICY IF EXISTS delete_own ON public.checkins;
DROP POLICY IF EXISTS select_public ON public.checkins;
CREATE POLICY select_own ON public.checkins FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY insert_own ON public.checkins FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY update_own ON public.checkins FOR UPDATE TO authenticated USING (user_id = auth.uid());
CREATE POLICY delete_own ON public.checkins FOR DELETE TO authenticated USING (user_id = auth.uid());
CREATE POLICY select_public ON public.checkins FOR SELECT TO anon, authenticated USING (is_public = true);

CREATE OR REPLACE FUNCTION public.get_travel_stats(target_user text)
RETURNS json LANGUAGE sql STABLE AS $$
  SELECT json_build_object(
    'total', COUNT(*),
    'cities', COUNT(DISTINCT address),
    'visited', COUNT(*) FILTER (WHERE status = 'visited'),
    'wish', COUNT(*) FILTER (WHERE status = 'wish')
  ) FROM public.checkins WHERE user_id = target_user;
$$;
GRANT EXECUTE ON FUNCTION public.get_travel_stats(text) TO anon, authenticated;
