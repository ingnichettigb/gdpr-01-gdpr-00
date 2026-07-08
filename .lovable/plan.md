## Obiettivo

Sostituire il Passaggio 1 (verifica email) con un flusso OTP custom su `lead_emails` + Resend, rimuovendo `supabase.auth.signInWithOtp/verifyOtp`. Passaggio 2/3 non vengono toccati in questo step (verranno adattati dopo, dato che oggi dipendono dalla sessione Supabase Auth).

## Nota tecnica sul termine "Edge Function"

Questo progetto è **TanStack Start** su Cloudflare Workers: non ci sono Supabase Edge Functions (Deno) nel repo. L'equivalente funzionale sono i **server routes** sotto `src/routes/api/public/*` — endpoint HTTP server-side dove giro service role key e Resend key senza esporle al browser. Comportamento identico a una Edge Function per il frontend (POST JSON, risposta JSON).

Se preferisci Edge Functions Supabase vere (Deno, dashboard Supabase), dimmelo e cambio approccio — richiederebbe però scaffolding `supabase/functions/` che oggi non esiste.

## Secrets richiesti

Prima dello sviluppo chiederò via `add_secret`:
- **`RESEND_API_KEY`** (pattern `re_...`) — necessaria per invio OTP
- **`SUPABASE_SERVICE_ROLE_KEY`** (pattern `eyJ...`) — necessaria per scrivere in `lead_emails` bypassando RLS

`SUPABASE_URL` è già disponibile (hardcoded nel client, la riuso lato server).

## Endpoint 1 — `POST /api/public/request-otp`

File nuovo: `src/routes/api/public/request-otp.ts`

Flusso handler:
1. Valida body `{ email: string }` con Zod, normalizza `email.trim().toLowerCase()`, regex email base.
2. Crea client Supabase con service role key (import dinamico dentro l'handler).
3. `SELECT * FROM lead_emails WHERE lower(email) = :email ORDER BY created_at DESC LIMIT 1`.
4. **Rate limit** (max 3/24h):
   - Se esiste riga con `otp_window_start` valorizzato e `now() - otp_window_start < 24h`:
     - Se `otp_attempts >= 3` → risposta 200 `{ rateLimited: true }` senza inviare.
     - Altrimenti incrementa `otp_attempts` nell'UPDATE al passo 6.
   - Se `otp_window_start` è nullo o più vecchio di 24h → resetta finestra: `otp_attempts = 1`, `otp_window_start = now()`.
5. Genera `verification_code` = stringa 6 cifre (`crypto.getRandomValues` per numero uniforme in 0–999999, padStart).
6. Persistenza:
   - Se **esiste riga non verificata**: UPDATE `verification_code`, `otp_window_start` (se resettato), `otp_attempts`.
   - Se **esiste solo riga già verificata** (`is_verified = true`): INSERT nuova riga `is_verified=false, source="corporateboostservice", otp_attempts=1, otp_window_start=now()`.
   - Se **nessuna riga**: INSERT come sopra.
7. Invio via Resend (`fetch https://api.resend.com/emails`, `Authorization: Bearer ${RESEND_API_KEY}`):
   - `from`: `Team CorporateBoost <team@corporateboostservice.eu>`
   - `subject`: `Codice di verifica: {code}`
   - `html`: markup semplice con codice a 6 cifre in evidenza (font grande, monospace, centrato) + testo "Il codice scade tra 10 minuti."
   - Se Resend risponde non-2xx → log server-side + risposta 500 `{ error: "send_failed" }`.
8. Successo → `{ sent: true }`.

Errori:
- Body invalido → 400 `{ error: "invalid_email" }`.
- Errore DB → 500 `{ error: "server_error" }`.

## Endpoint 2 — `POST /api/public/verify-otp`

File nuovo: `src/routes/api/public/verify-otp.ts`

Flusso handler:
1. Valida body `{ email, code }` con Zod (code = 6 cifre).
2. Client service role.
3. `SELECT id, otp_window_start, created_at FROM lead_emails WHERE lower(email) = :email AND verification_code = :code AND is_verified = false ORDER BY created_at DESC LIMIT 1`.
4. Non trovata → `{ ok: false, reason: "invalid" }`.
5. Calcola `windowStart = otp_window_start ?? created_at`. Se `now() - windowStart > 10 minuti` → `{ ok: false, reason: "expired" }`.
6. UPDATE `is_verified = true, verified_at = now()` per quel `id`.
7. Ritorna `{ ok: true }`.

Nessuna CORS custom: same-origin.

## Frontend

### `src/routes/auth.tsx` (Passaggio 1)
- Rimuovo `supabase.auth.signInWithOtp`.
- Sostituisco con `fetch("/api/public/request-otp", { method: "POST", body: JSON.stringify({ email }) })`.
- Mapping errori:
  - `rateLimited: true` → **E-011** "Troppi invii ravvicinati. Riprova tra qualche minuto."
  - `error: "invalid_email"` → **E-010**.
  - `error: "send_failed"` / 500 / network → **E-010** "Impossibile inviare il codice. Verifica l'indirizzo email."
- Su `sent: true`: `sessionStorage.setItem("accesso_email", cleanEmail)` (già presente) → `navigate({ to: "/auth/verifica" })`.

### `src/routes/auth.verifica.tsx` (Passaggio 1b)
- Rimuovo `supabase.auth.verifyOtp` e `supabase.auth.getUser()`.
- Sostituisco con `fetch("/api/public/verify-otp", { method: "POST", body: JSON.stringify({ email, code: token }) })`.
- Mapping:
  - `ok: false, reason: "invalid" | "expired"` → **E-012** "Codice non corretto o scaduto. Riprova o richiedi un nuovo invio."
  - HTTP non-2xx / network → **E-013** "Errore tecnico durante la verifica. Riprova."
- Su `ok: true`: `sessionStorage.setItem("verified_email", email)` + naviga a `/attivazione`.

### Altri file frontend
- `src/routes/accesso.verifica.tsx` e `accesso.tsx`: già redirect verso `/auth*`, restano invariati.
- `src/integrations/supabase/client.ts`: **non lo modifico** (serve ancora per Passaggio 2 finché non lo aggiorni).

## Passaggio 2 — cosa succede ora

`attivazione.tsx` chiama `verifyAndActivateLicense`, che dentro fa `supabase.auth.getUser()`. Dopo questa modifica non ci sarà più sessione → tutte le attivazioni falliranno con **E-001 `email_not_verified`** e redirect a `/auth`.

Come da tuo brief non lo tocco in questo step, ma lo segnalo: il Passaggio 2 sarà **rotto** finché non lo aggiorniamo per leggere `sessionStorage.verified_email` invece della sessione Supabase (e la logica server per validare la licenza dovrà essere ripensata, non potendo più fidarsi di `auth.uid()`).

## Tabella file

| File | Azione |
|---|---|
| `src/routes/api/public/request-otp.ts` | nuovo — server route POST |
| `src/routes/api/public/verify-otp.ts` | nuovo — server route POST |
| `src/routes/auth.tsx` | chiama request-otp, non signInWithOtp |
| `src/routes/auth.verifica.tsx` | chiama verify-otp, salva verified_email in sessionStorage |
| `src/integrations/supabase/client.ts` | invariato |
| `src/lib/license.functions.ts` | invariato |
| `src/routes/attivazione.tsx` | invariato |

## Cose che NON tocco (conferma tua)

- `auth.users` / Supabase Auth (resta configurato ma inutilizzato dal Passaggio 1).
- Schema `lead_emails`.
- `license.functions.ts`, Passaggio 2, Passaggio 3.
- RLS su schema `public`.

## Da confermare prima di procedere

1. Ok "Edge Function" = server route TanStack sotto `/api/public/*` (unica opzione praticabile in questo repo), o vuoi che scaffoldi `supabase/functions/` per Deno reali?
2. Ok procedere sapendo che il Passaggio 2 sarà temporaneamente rotto finché non lo aggiorniamo nello step successivo?
3. Il dominio `corporateboostservice.eu` è verificato nel tuo account Resend? (altrimenti Resend rifiuterà l'invio da quel `from`).
