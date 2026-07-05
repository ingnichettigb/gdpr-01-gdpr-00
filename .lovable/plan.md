
## Stato attuale

- **Pagina esiste**: `src/routes/accesso.attiva.tsx` (route `/accesso/attiva`), raggiungibile dopo login OTP via `/accesso` → `/accesso/verifica`.
- **Non è linkata pubblicamente**: nessun bottone su `/` (home) o `/corso`.
- **Logica attuale diversa da quella richiesta**: chiede all'utente ditta/cognome/nome + `license_key` + `puk_code`, valida entrambi separatamente e poi il mapping. Include un DEV bypass (7 click).
- **Home `/` ha un flusso parallelo**: `OnboardingForm` in `src/routes/index.tsx` chiede direttamente `licenseKey` senza PUK e salva tutto in `localStorage` — non tocco questa route (fuori scope della richiesta).

## Cosa faccio

### 1. Riscrivo `src/routes/accesso.attiva.tsx` — form solo PUK

Nuovo flusso, esattamente come richiesto:

1. `supabase.auth.getUser()` — se manca sessione → `navigate({ to: "/accesso" })`.
2. Input singolo **Codice PUK** (trim, case-sensitive, no normalizzazione).
3. **SELECT `puk_codes`** where `code = <trim>` → verifica esiste, `used = false`, `expires_at IS NULL OR expires_at > now()`. Errore unico: *"Codice non valido, già utilizzato o scaduto."*
4. **SELECT `license_puk_map`** where `puk_id = puk.id` → ottieni `license_id`. Se manca → *"Nessuna licenza collegata a questo PUK."*
5. **SELECT `licenses`** where `id = license_id` → verifica `is_active = true` e (`expires_at IS NULL` o futura). Errore: *"La licenza collegata a questo PUK non è attiva o è scaduta."*
6. Solo se tutto ok, in ordine:
   - `UPDATE puk_codes SET used=true, used_at=now(), user_id=<uid> WHERE id=<puk.id> AND used=false` (mantengo `used=false` per anti-race). Se `count = 0` righe aggiornate → mostra errore "PUK appena utilizzato" e stop.
   - `UPDATE licenses SET user_email=<email> WHERE id=<license_id> AND user_email IS NULL`.
   - `UPSERT users` con `{id: uid, email, name: email}` on conflict `id` (name lo mettiamo = email, dato che il form non chiede più nome — l'utente lo compila poi in `/` onboarding).
7. `navigate({ to: "/corso" })`.

Rimuovo: campi ditta/cognome/nome/license_key, DEV bypass, salvataggio `course_id` in sessionStorage (mai riletto).

### 2. CTA visibile "Hai già un PUK? Attiva qui"

Aggiungo un `<Link to="/accesso/attiva">` come pulsante secondario:
- **Home `/`** (nel component `Dashboard` header, sotto il bottone "Inizia il corso") — visibile a chi è già dentro.
- **Onboarding form in `/`** — sotto il form, sopra il footer, così un nuovo utente senza PUK-flow può passare al nuovo flusso.
- **`/corso`** — piccola nota in alto "Hai un PUK? [Attiva qui]".

Nessuna nav globale esiste oggi, quindi metto CTA inline.

### 3. Verifica RLS (read-only, ti mostro poi cosa modificare)

Prima di toccare policy: in build mode leggo con `psql` le policy attuali su `public.puk_codes`, `public.licenses`, `public.license_puk_map`, `public.users` e te le mostro. Confronto con quelle in `docs/migration_accesso_funnel.sql` (che sono le "attese"):

- `puk_codes` SELECT/UPDATE `TO authenticated` — accettabile: SELECT è `USING (true)` (necessario per lookup per `code`, che è già segreto); UPDATE ristretta a `used=false → used=true AND user_id=auth.uid()`.
- `licenses` SELECT `TO authenticated USING (true)` + UPDATE limitata a assegnare `user_email` proprio.
- `license_puk_map` SELECT `TO authenticated USING (true)`.
- `users` full CRUD proprio ristretto a `id = auth.uid()`.

**Se le policy in DB combaciano**, non modifico nulla. Se differiscono (es. permessi ad `anon`, o UPDATE non ristretto), ti propongo una migration puntuale prima di applicarla.

## Cosa NON tocco

- Tabella/logica `certificates`.
- Route `/`, `/corso`, `/test`, `/attestato` — solo aggiungo CTA link.
- Schema DB.
- Flusso OTP `/accesso` e `/accesso/verifica`.

## File modificati

- `src/routes/accesso.attiva.tsx` — riscritto (form solo PUK).
- `src/routes/index.tsx` — aggiunto link CTA (2 punti).
- `src/routes/corso.tsx` — aggiunto link CTA (1 punto).
- Eventuale nuova migration `docs/migration_puk_activation_rls.sql` **solo se** le policy attuali risultano insicure — te la mostro prima di eseguirla.
