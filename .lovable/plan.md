> **⚠️ QUESTO PIANO È SUPERATO E NON VA IMPLEMENTATO.**
>
> Descrive un'architettura (`public.users`, `course_progress`, `course_tests`,
> `course_modules`, `supabase.auth.getUser()`) mai completata, mai testata, e
> **causa diretta di 4 incidenti in produzione il 2026-08-06** (video sostituiti
> da placeholder, accesso al test bloccato, funnel bypassato).
>
> L'architettura realmente in uso oggi è documentata in **`ARCHITETTURA.md`**
> (nella root del repository) — leggere quello prima di qualsiasi modifica a
> `corso.tsx`, `test.tsx`, `attivazione.tsx`, `index.tsx`, `VideoLesson.tsx`,
> o a qualsiasi file in `src/lib/`.
>
> Il PUK/licenza + `video_progress` (per `puk_code`) è la fonte di verità.
> `public.users`/`course_progress`/`userId` NON vanno usati.
>
> ---
>
> Contenuto originale conservato sotto solo per riferimento storico — non è
> una checklist da completare.

---

## Contesto verificato

- L'app non usa Supabase Auth: l'identità è OTP su `lead_emails` + licenza/PUK in `sessionStorage`/`localStorage` (`auth.index.tsx`, `auth.verifica.tsx`, `attivazione.tsx`). Quindi `auth.uid()` è sempre `null` e `supabase.auth.getUser()` in `index.tsx` non restituisce mai un utente: oggi la home mostra sempre la landing.
- Tutti i dati (licenses, puk_codes, lead_emails, certificates) stanno nel **database esterno**, raggiunto solo da server functions con service role (`client.external.ts`). Il frontend non può interrogarlo direttamente con l'anon key.
- Il tracking video è oggi in `localStorage` con chiavi per PUK (`VideoLesson.tsx`), le lezioni sono costanti (`corso.tsx`), e in `test.tsx` il certificato viene salvato senza `user_id`/`course_id`.
- `accesso.attiva.tsx` è solo un redirect verso `/attivazione`: il form reale è in `attivazione.tsx`.

Conseguenza architetturale: **ogni lettura/scrittura sulle tabelle corso passa da nuove server functions** (`src/lib/course.functions.ts`), non da query client-side.

## Prerequisiti sul DB esterno (SQL da eseguire nel progetto Supabase esterno)

Fornisco il file `docs/migration_users_courses.sql` (stesso pattern dei file già presenti in `docs/`), da eseguire manualmente:

- `create table if not exists public.users (id uuid primary key default gen_random_uuid(), email text unique not null, created_at timestamptz default now())`
- `alter table public.puk_codes add column if not exists user_id uuid`
- `alter table public.courses add column if not exists app_code text` + `update courses set app_code = '01-GDPR-00'` sulla riga del corso
- grant/RLS non necessari: l'accesso avviene solo via service role.

Se preferisci non toccare `courses`, la mappatura può restare in codice (`COURSE_ID_BY_APP_CODE`), ma serve l'UUID del corso.

## Implementazione

**1. Identità utente (`src/lib/license.functions.ts`)**
- Dopo la verifica email (punto 0) e prima delle query su `puk_codes`: upsert su `users` con `{ email }`, `onConflict: "email"`, `select("id")` → `userId`.
- Aggiungere `userId` a tutti e 3 i `return { ok: true, ... }` e al tipo `ActivationResult`.
- Nell'update del PUK libero (punto 6) scrivere anche `user_id: userId`.

**2. Persistenza attivazione (`src/routes/attivazione.tsx`)**
- Includere `userId` in `activationPayload` salvato in `sessionStorage.activation` e `localStorage.lastActivation`.

**3. Guard d'ingresso (`src/routes/index.tsx`)**
- Rimuovere il check `supabase.auth.getUser()` (inefficace).
- Se `localStorage.lastActivation` contiene un `userId` valido: reidratare `sessionStorage.activation` e reindirizzare subito a `/corso`, saltando `/auth` e `/attivazione`.
- In parallelo, una server function `findActiveLicenseByEmail` verifica su `licenses` (`user_email` = email verificata, `is_active = true`, `app_code`) per il caso in cui esista solo `verified_email` in sessione: se trovata, redirect a `/corso`.
- Altrimenti landing come oggi.

**4. Nuovo `src/lib/course.functions.ts` (server functions, `supabaseExternal`)**
- `getCourseByAppCode()` — risolve il `course_id` **solo** da `APP_CODE` (`@/lib/app-config`); unico punto di mappatura app→corso.
- `getCourseModules()` — `course_modules` filtrata per `course_id`, ordinata `order_index`; ritorna DTO `{ id, title, youtube_url, order_index, duration_seconds }`.
- `getCourseProgress({ userId })` — righe `course_progress` per i module_id del corso; ritorna `{ moduleId, status }[]` + `course_completed`.
- `markModuleCompleted({ userId, moduleId })` — upsert `course_progress` con `status: 'completed'`, `completed_at: now()`; poi conta i moduli completati e, se tutti, imposta `course_completed = true` e `course_completed_at = now()`; ritorna `{ allCompleted }`.
- `saveTestResult({ userId, score, passed })` — insert in `course_tests` con `course_id`, `taken_at: now()`.

**5. Player e carosello (`src/routes/corso.tsx`, `src/components/VideoLesson.tsx`)**
- Sostituire `LESSON_1`/`LESSON_2` con i moduli caricati da `getCourseModules` (loader + TanStack Query); step del carosello generati dinamicamente, con sbloccaggio sequenziale per `order_index`.
- Stato completato letto da `getCourseProgress` invece di `localStorage`; `localStorage` resta solo per la posizione di ripresa e l'anti-skip.
- `VideoLesson`: `handleEnded` chiama `markModuleCompleted` (oltre al salvataggio locale) e invalida la query di progresso; nuova prop `moduleId`.
- Nuovo pulsante **"Esci"** sempre visibile nell'area player, che porta a `/` (dashboard/lista corsi).

**6. Test finale (`src/routes/test.tsx`)**
- Gate d'accesso basato su `course_progress` (tutti i moduli completati) invece di `isLessonCompleted`.
- Al superamento: `saveTestResult(...)` in aggiunta alle scritture in `localStorage`.
- Passare `userId` e `courseId` a `saveCertificate`; in `certificate.functions.ts` estendere lo schema Zod e l'`insert` con `user_id` e `course_id` (oggi sempre NULL).

## Note tecniche

- Tutte le nuove server functions usano `await import("@/integrations/supabase/client.external")` dentro l'handler, con validazione Zod e ritorno di DTO serializzabili — nessuna eccezione propagata al client.
- `course_modules.youtube_url`: se i moduli attuali usano URL di file video, il player `<video>` resta valido; per URL YouTube reali servirà un iframe embed (con perdita del controllo anti-skip). Segnalo il punto e mantengo `<video>` fino a conferma.
- Nessun `auth.uid()`: l'`user_id` scritto è sempre l'`id` di `public.users`.
