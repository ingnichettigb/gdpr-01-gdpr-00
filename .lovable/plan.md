## Obiettivo

Ristrutturare l'accesso in 3 schermate distinte con codici errore univoci per la diagnostica.

## Flusso a 3 schermate

```text
/auth  →  /attivazione  →  /dati-attestato  →  /corso
(OTP)     (licenza+PUK)    (nome/CF/ditta)
```

Ogni step gated: se non hai fatto lo step precedente, redirect indietro.

### Schermata 1 — `/auth` (verifica email)

Rinomino `/accesso` → `/auth` e `/accesso/verifica` → `/auth/verifica` (mantengo redirect da vecchie route per non rompere link).

Testo intestazione aggiornato: "Verifichiamo che tu sia il proprietario di questa casella di posta. Ti invieremo un codice a 6 cifre via email."

**Sistema OTP scelto**: Supabase Auth nativo (`signInWithOtp` / `verifyOtp`). Non introduco `lead_emails`, `verification_code`, Edge Function `send-email`, né limite custom 3/24h — Supabase gestisce già invio, TTL e rate limit nativi. Non serve la tua chiave Resend per questo flusso.

Codici errore mappati sugli errori Supabase:
- **E-010** — invio fallito (`signInWithOtp` error, email malformata, rete): "Impossibile inviare il codice. Verifica l'indirizzo email. (E-010)"
- **E-011** — rate limit Supabase raggiunto (error message contiene `rate limit` / `over_email_send_rate_limit`): "Troppi invii ravvicinati. Riprova tra qualche minuto. (E-011)" (Supabase applica ~1/60s; il "3/24h" del brief non è nativo — se lo vuoi davvero applicato, va costruito custom: dimmelo separatamente.)
- **E-012** — `verifyOtp` fallita (codice errato/scaduto): "Codice non corretto o scaduto. Riprova o richiedi un nuovo invio. (E-012)"
- **E-013** — verifica riuscita ma sessione non stabilita (edge case, `getUser()` post-verify torna null): "Errore tecnico durante la verifica. Riprova. (E-013)"

Nota su `VERIFIED_EMAIL_KEY` in localStorage: con Supabase Auth la fonte di verità è la sessione (`supabase.auth.getUser()`), non un flag localStorage. Rimuovo eventuali flag "verified" locali e uso solo la sessione per gating dello step successivo — così sparisce il rischio "verificato nel browser ma non nel DB" citato nel brief.

### Schermata 2 — `/attivazione` (licenza + PUK)

Rinomino `/accesso/attiva` → `/attivazione`.

Form: **License Key** + **Codice PUK** (rimuovo email disabled — già garantita da sessione).

Estraggo la logica in **`src/lib/license.functions.ts`** come `createServerFn` con `.middleware([requireSupabaseAuth])`. Firma:

```ts
verifyAndActivateLicense({ licenseKey, puk }) →
  | { ok: true, licenseId, licenseKey }
  | { ok: false, reason, code }
```

Logica server-side (RLS bypassata via admin client caricato dentro l'handler — necessario perché il match cross-tabella con anti-race è più affidabile server-side, e la funzione autorizza via `requireSupabaseAuth`):

1. `app_code = "02-GDPR-00"` **hardcoded**.
2. `context.userId` + email da `context.claims`.
3. SELECT `licenses` WHERE `license_key = trim(licenseKey)` AND `app_code = "02-GDPR-00"` AND `is_active = true`:
   - Nessun risultato → **E-101** `license_not_found`
   - `user_email` valorizzata e ≠ email verificata → **E-102** `email_mismatch`
   - `expires_at` nel passato → **E-103** `license_expired`
4. SELECT `puk_codes` JOIN `license_puk_map` WHERE `code = trim(puk)` AND map.license_id = license.id:
   - Nessun risultato → **E-201** `puk_not_found`
   - `used = true` AND `licenses.activated_at IS NULL` → **E-202** `puk_already_used`
   - `used = true` AND `activated_at` valorizzato AND `licenses.user_email = email verificata` → **ok** (riattivazione stesso utente, idempotente)
5. UPDATE `puk_codes` SET `used=true, used_at=now(), user_id=uid` WHERE id AND `used=false` (anti-race).
6. UPDATE `licenses` SET `user_email=email, activated_at=now()` WHERE id AND (`user_email IS NULL OR user_email=email`).
7. UPSERT `users` `{id, email}`.
8. Qualsiasi eccezione DB / timeout → catch → **E-500** `server_error`.

**Client `/attivazione.tsx`**: chiama la server function via `useServerFn`, mappa `reason` → messaggio localizzato con `(codice)` in fondo. E-001 (email non verificata via gate) → redirect `/auth`. Su `ok:true` → `navigate({ to: "/dati-attestato" })` e salva `licenseId`/`licenseKey` in sessionStorage per lo step 3.

### Schermata 3 — `/dati-attestato`

Nuova route. Estraggo `OnboardingForm` da `src/routes/index.tsx` e lo sposto qui (nome, cognome, CF, luogo/data nascita, ditta). Salva in `localStorage["attestato_data"]` come oggi, poi `navigate({ to: "/corso" })`.

Gate: se manca sessione → `/auth`; se manca `licenseId` in sessionStorage → `/attivazione`.

`/` (index) diventa solo landing + CTA "Inizia" → `/auth`. Rimuovo le CTA duplicate "Hai già un PUK".

## Sicurezza / RLS

Con la logica spostata server-side dentro `verifyAndActivateLicense` (admin client autorizzato da `requireSupabaseAuth`), le policy `TO authenticated USING(true)` su `puk_codes`/`licenses`/`license_puk_map` diventano non necessarie per il flusso app. Proposta separata (non applico in questo giro senza tua conferma): restringere quelle SELECT a `TO service_role` per chiudere la superficie con anon key. Te la mostro come SQL a parte prima di eseguirla.

## Tabella file

| File | Azione |
|---|---|
| `src/routes/auth.tsx` | nuovo (rinomina da `accesso.tsx`) + testo verifica proprietà + codici E-010/011 |
| `src/routes/auth.verifica.tsx` | nuovo (rinomina) + codici E-012/013, rimuove `VERIFIED_EMAIL_KEY` |
| `src/routes/accesso.tsx` / `accesso.verifica.tsx` | redirect helper verso nuove route |
| `src/routes/attivazione.tsx` | nuovo, form license+PUK, mapping codici E-101…E-500 |
| `src/routes/accesso.attiva.tsx` | rimosso |
| `src/lib/license.functions.ts` | nuovo, `verifyAndActivateLicense` server fn con requireSupabaseAuth |
| `src/routes/dati-attestato.tsx` | nuovo, form dati attestato (estratto da index) |
| `src/routes/index.tsx` | rimuove OnboardingForm + CTA PUK, resta landing |
| `src/routes/corso.tsx` | rimuove CTA PUK |

## Cose che NON tocco

- Tabella `certificates` e generazione PDF.
- Schema DB (nessuna nuova tabella; niente `lead_emails`).
- Contenuti corso/test.
- Non chiedo la tua chiave Resend — Supabase Auth invia già l'OTP.

## Punti da confermare prima di procedere

1. Ok Supabase Auth nativo (no Resend, no `lead_emails`, no limite custom 3/24h)?
2. Ok rimuovere `OnboardingForm` da `/` e spostarlo in `/dati-attestato`?
3. Ok redirect vecchie route `/accesso*` → nuove `/auth*` / `/attivazione`?
