DO $$
DECLARE
  tbl record;
BEGIN
  FOR tbl IN
    SELECT c.relname AS table_name
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND c.relkind IN ('r','p')
  LOOP
    EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON public.%I TO authenticated', tbl.table_name);
    EXECUTE format('GRANT ALL ON public.%I TO service_role', tbl.table_name);
  END LOOP;
END $$;

-- La séquence éventuelle du rôle user_roles doit aussi être utilisable si elle existe.
DO $$
DECLARE
  seq record;
BEGIN
  FOR seq IN
    SELECT c.relname AS sequence_name
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND c.relkind = 'S'
  LOOP
    EXECUTE format('GRANT USAGE, SELECT ON SEQUENCE public.%I TO authenticated', seq.sequence_name);
    EXECUTE format('GRANT ALL ON SEQUENCE public.%I TO service_role', seq.sequence_name);
  END LOOP;
END $$;