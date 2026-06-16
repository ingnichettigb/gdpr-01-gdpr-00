-- ============================================================
-- ESEGUIRE QUESTO SCRIPT NEL SQL EDITOR DEL SUPABASE ESISTENTE
-- (progetto ruopxyprezzxoirfrjrm)
-- ============================================================

-- A) Nuove colonne immutabili su public.certificates
ALTER TABLE public.certificates
  ADD COLUMN IF NOT EXISTS certificate_number text UNIQUE,
  ADD COLUMN IF NOT EXISTS license_id uuid REFERENCES public.licenses(id),
  ADD COLUMN IF NOT EXISTS license_key text,
  ADD COLUMN IF NOT EXISTS nome_snapshot text,
  ADD COLUMN IF NOT EXISTS cf_snapshot text,
  ADD COLUMN IF NOT EXISTS ditta_snapshot text,
  ADD COLUMN IF NOT EXISTS luogo_nascita_snapshot text,
  ADD COLUMN IF NOT EXISTS data_nascita_snapshot date;

-- L'app è anonima: rendiamo nullable i campi che oggi sono NOT NULL
ALTER TABLE public.certificates
  ALTER COLUMN user_id DROP NOT NULL,
  ALTER COLUMN course_id DROP NOT NULL,
  ALTER COLUMN pdf_url DROP NOT NULL;

-- B) Trigger immutabilità
CREATE OR REPLACE FUNCTION public.certificates_immutable_fields()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.certificate_number IS DISTINCT FROM OLD.certificate_number
     OR NEW.issued_at IS DISTINCT FROM OLD.issued_at
     OR NEW.license_id IS DISTINCT FROM OLD.license_id
     OR NEW.license_key IS DISTINCT FROM OLD.license_key
     OR NEW.cf_snapshot IS DISTINCT FROM OLD.cf_snapshot
     OR NEW.nome_snapshot IS DISTINCT FROM OLD.nome_snapshot
     OR NEW.ditta_snapshot IS DISTINCT FROM OLD.ditta_snapshot
     OR NEW.luogo_nascita_snapshot IS DISTINCT FROM OLD.luogo_nascita_snapshot
     OR NEW.data_nascita_snapshot IS DISTINCT FROM OLD.data_nascita_snapshot
  THEN
    RAISE EXCEPTION 'Campi del certificato non modificabili dopo l''emissione';
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_certificates_immutable ON public.certificates;
CREATE TRIGGER trg_certificates_immutable
  BEFORE UPDATE ON public.certificates
  FOR EACH ROW EXECUTE FUNCTION public.certificates_immutable_fields();

-- C) RLS
ALTER TABLE public.certificates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon insert cert" ON public.certificates;
CREATE POLICY "anon insert cert" ON public.certificates
  FOR INSERT TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon read cert" ON public.certificates;
CREATE POLICY "anon read cert" ON public.certificates
  FOR SELECT TO anon, authenticated USING (true);

-- niente policy UPDATE/DELETE → bloccati di default

GRANT SELECT, INSERT ON public.certificates TO anon, authenticated;

-- D) SELECT su licenses per validare la license_key
GRANT SELECT ON public.licenses TO anon, authenticated;
ALTER TABLE public.licenses ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "anon read license for validation" ON public.licenses;
CREATE POLICY "anon read license for validation" ON public.licenses
  FOR SELECT TO anon, authenticated USING (true);
