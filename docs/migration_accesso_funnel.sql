-- ============================================================
-- FASE 1 — Funnel di accesso /accesso
-- Esegui questo SQL nel SQL Editor di Supabase
-- ============================================================

-- Abilita RLS sulle tabelle coinvolte (se non già attivo)
ALTER TABLE public.licenses        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.puk_codes       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.license_puk_map ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users           ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- LICENSES: lettura ad utenti autenticati per validazione
-- ============================================================
DROP POLICY IF EXISTS "auth read licenses for activation" ON public.licenses;
CREATE POLICY "auth read licenses for activation"
  ON public.licenses
  FOR SELECT
  TO authenticated
  USING (true);

-- Update: solo per associare la propria email se NULL
DROP POLICY IF EXISTS "auth claim license email" ON public.licenses;
CREATE POLICY "auth claim license email"
  ON public.licenses
  FOR UPDATE
  TO authenticated
  USING (user_email IS NULL OR user_email = (auth.jwt() ->> 'email'))
  WITH CHECK (user_email = (auth.jwt() ->> 'email'));

-- ============================================================
-- PUK_CODES: lettura per validazione, update solo per marcare used
-- ============================================================
DROP POLICY IF EXISTS "auth read puk for activation" ON public.puk_codes;
CREATE POLICY "auth read puk for activation"
  ON public.puk_codes
  FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "auth activate own puk" ON public.puk_codes;
CREATE POLICY "auth activate own puk"
  ON public.puk_codes
  FOR UPDATE
  TO authenticated
  USING (used = false)
  WITH CHECK (used = true AND user_id = auth.uid());

-- ============================================================
-- LICENSE_PUK_MAP: solo lettura per validazione mapping
-- ============================================================
DROP POLICY IF EXISTS "auth read license_puk_map" ON public.license_puk_map;
CREATE POLICY "auth read license_puk_map"
  ON public.license_puk_map
  FOR SELECT
  TO authenticated
  USING (true);

-- ============================================================
-- USERS: ognuno gestisce solo la propria riga (id = auth.uid())
-- ============================================================
DROP POLICY IF EXISTS "user select own"  ON public.users;
DROP POLICY IF EXISTS "user insert own"  ON public.users;
DROP POLICY IF EXISTS "user update own"  ON public.users;

CREATE POLICY "user select own" ON public.users
  FOR SELECT TO authenticated USING (id = auth.uid());

CREATE POLICY "user insert own" ON public.users
  FOR INSERT TO authenticated WITH CHECK (id = auth.uid());

CREATE POLICY "user update own" ON public.users
  FOR UPDATE TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- ============================================================
-- GRANTS (Data API)
-- ============================================================
GRANT SELECT, UPDATE ON public.licenses        TO authenticated;
GRANT SELECT, UPDATE ON public.puk_codes       TO authenticated;
GRANT SELECT         ON public.license_puk_map TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.users   TO authenticated;
