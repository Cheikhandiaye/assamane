CREATE TABLE IF NOT EXISTS public.app_settings (
  key text PRIMARY KEY,
  value jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_by uuid REFERENCES public.profiles(id),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.app_settings TO authenticated, anon;
GRANT ALL ON public.app_settings TO service_role;
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "settings_read_all" ON public.app_settings FOR SELECT TO authenticated, anon USING (true);
CREATE POLICY "settings_admin_write" ON public.app_settings FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
INSERT INTO public.app_settings (key, value) VALUES
  ('platform', '{"nom":"ASSIRIK","logo_url":null,"couleur_primaire":"#7C3AED","couleur_secondaire":"#F97316"}'::jsonb)
ON CONFLICT (key) DO NOTHING;