## Verifica schema DB ✓
Tutte e 6 le tabelle richieste esistono nel tuo Supabase con i campi necessari. Unica differenza: `puk_codes.type` si chiama `type_product_code` nel DB → uso quello.

## Decisioni prese
- **ditta/cognome/nome** → salvati in `public.users.name` come stringa unica `"DITTA | COGNOME NOME"` (nessuna colonna nuova, nessun campo fuori dalle tabelle indicate).
- **OTP via `team@corporateboostservice.eu`** → richiede setup email domain di Lovable (DNS sul dominio corporateboostservice.eu) + scaffolding template auth.
- **Flusso esistente intatto** fino all'accesso. Il nuovo funnel termina al "Accesso autorizzato → vai alla dashboard". Pagamento e dashboard li affineremo in fasi successive.
- **Service role key** salvata come secret server-side. Pulsante "Conferma e procedi" qui sotto avvierà il form.

## Piano splittato per fasi

### FASE 1 — Funnel di accesso (questa iterazione)
Tre route nuove, vecchie route intatte:

```text
/accesso          → step 1: email + invio OTP
/accesso/verifica → step 2: 6 cifre OTP
/accesso/attiva   → step 3: ditta, cognome, nome, license_key, puk_code
                    (email read-only, presa da sessione auth)
                    → server fn validateAndActivate
                    → redirect /accesso/successo
/accesso/successo → "Accesso autorizzato. Dashboard in arrivo."
```

**Backend (server functions):**
- `sendOtp(email)` → `supabase.auth.signInWithOtp({ email, options: { shouldCreateUser: true } })`
- `verifyOtp(email, token)` → `supabase.auth.verifyOtp({ email, token, type: 'email' })`
- `validateAndActivate({ ditta, cognome, nome, license_key, puk_code })` con `requireSupabaseAuth`:
  1. SELECT `licenses` WHERE `license_key = ? AND is_active = true AND (expires_at IS NULL OR expires_at > now())`
  2. SELECT `puk_codes` WHERE `code = ? AND used = false AND (expires_at IS NULL OR expires_at > now())`
  3. SELECT `license_puk_map` WHERE `license_id = ? AND puk_id = ?`
  4. Se tutto ok: UPDATE `puk_codes SET used=true, used_at=now(), user_id=auth.uid()`; UPDATE `licenses SET user_email=?` se NULL; UPSERT `public.users (id=auth.uid(), email, name="DITTA | COGNOME NOME")`.
  5. Ritorna `course_id` (dal puk) → redirect `/accesso/successo` (in Fase 2 diventerà `/dashboard`).

**Setup tecnico richiesto in questa fase:**
1. Salvataggio `SUPABASE_SERVICE_ROLE_KEY` come secret (uso `add_secret`).
2. Configurazione dominio email `corporateboostservice.eu` per ricevere OTP da `team@`. Ti aprirò il dialog di setup DNS.
3. Scaffolding template auth email (branding minimo).

### FASE 2 — Dashboard utente (dopo Fase 1)
- Route `/dashboard` (sotto `_authenticated/`)
- Query: PUK dell'utente → corsi → moduli ordinati per `order_index`
- Stato per modulo da `course_progress`
- Pulsanti "Riprendi corso" + "Scarica attestato" (disabilitato finché non completo)

### FASE 3 — Player corso + tracking
- Route `/corso/$courseId`
- Player YouTube embed con tracking `onEnd` → upsert `course_progress.status='completed'`
- Quando tutti i moduli completati → `course_completed=true, course_completed_at=now()`

### FASE 4 — Pagamento (da discutere)
- Da definire: Stripe / Paddle / altro? Cosa si paga (licenza? singolo corso? PUK?)?
- Lo affineremo separatamente quando le prime 3 fasi funzionano.

## File toccati in Fase 1
**Nuovi**: `src/routes/accesso.tsx`, `src/routes/accesso.verifica.tsx`, `src/routes/accesso.attiva.tsx`, `src/routes/accesso.successo.tsx`, `src/lib/access.functions.ts`, migration SQL per RLS minime.
**Modificati**: `src/integrations/supabase/client.ts` (abilita `persistSession`), `src/start.ts` (attach bearer), `src/routes/__root.tsx` (link a `/accesso` opzionale).
**Intatti**: `/`, `/corso`, `/test`, `/attestato`, `VideoLesson`, `generateAttestatoPdf`, `docs/migration_certificates.sql`.

## Cosa mi serve da te per partire
1. Conferma uso `team@corporateboostservice.eu` come mittente OTP → ti aprirò il setup DNS del dominio.
2. Conferma salvataggio `SUPABASE_SERVICE_ROLE_KEY` (rigenerala prima su Supabase: Settings → API → Reset service_role).
3. Approva il piano per partire con la Fase 1.