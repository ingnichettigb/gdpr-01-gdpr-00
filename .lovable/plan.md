# Piano tecnico — 01-GDPR-00 "Corso My Privacy"

Riferimento unico: `ARCHITETTURA.md` (root del repo, aggiornato 2026-08-06).
Checkpoint stabile: tag Git `checkpoint-20260806-funnel-security-fix`.
Dominio: `01-gdpr-00.corporateboostservice.eu`.

Questo documento descrive l'architettura in uso e le regole da rispettare in
ogni intervento futuro. Non è una checklist di lavori da eseguire: le attività
aperte sono elencate solo nella sezione finale.

---

## 1. Contesto

App di e-learning GDPR, gemella di `02-GDPR-00` ("Corso Privacy Addetto").
Parte del portfolio CorporateBoostService, che condivide un unico progetto
Supabase esterno fra 14+ prodotti, distinti tramite `app_code`.

Stack: React + TanStack Start/Router (Lovable) · Supabase esterno (accesso solo
via server function con service role) · Resend (email) · Cloudflare (DNS/CDN) ·
GitHub.

Contenuti: ancora embrionali (video segnaposto, test da riscrivere).
L'architettura tecnica è invece considerata stabile e va duplicata identica su
`02-GDPR-00`.

---

## 2. Identità: OTP + PUK, non un login

L'app non ha autenticazione utente. L'identità si compone di due passaggi:

1. **OTP via email** su `lead_emails` → `sessionStorage.verified_email`
2. **Licenza + PUK** → `sessionStorage.activation` e `localStorage.lastActivation`

Il **PUK è l'identificatore del corsista**: consenso, progresso video e
certificato sono tutti scopati per PUK.

### Chiavi browser (tutte solo cache di esperienza utente)

| Chiave | Storage | Scopo | Scritta da |
|---|---|---|---|
| `verified_email` | session | email confermata via OTP | `auth.verifica.tsx` |
| `activation` | session | `{licenseId, licenseKey, puk}` sessione corrente | `attivazione.tsx` |
| `lastActivation` | local | stessa struttura, persistente (recupero cross-browser) | `attivazione.tsx` |
| `attestato_data` | local | anagrafica + puk, per rigenerare l'attestato | `dati-attestato.tsx` |
| `completed_{PUK}_{lezione}` | local | flag locale "video visto" | `VideoLesson.tsx` |
| `progress_{PUK}_{lezione}`, `max_progress_{PUK}_{lezione}` | local | ripresa video, anti-skip | `VideoLesson.tsx` |
| `attestato_cert_number_{PUK}`, `_cert_id_`, `_issued_at_` | local | cache certificato emesso | `test.tsx` |
| `test_passed_{PUK}` | local | flag locale test superato | `test.tsx` |

**Regola invariante**: nessuna di queste chiavi, da sola, concede accesso a
corso, test o dashboard. Il gate è sempre una rivalidazione server-side.

---

## 3. Modello dati (fonte di verità, Supabase esterno)

Pattern multi-seat: **1 licenza → N PUK**.

- **`licenses`** — `id`, `license_key`, `user_email` (ACQUIRENTE), `is_active`,
  `expires_at`, `app_code`
- **`puk_codes`** — `id`, `code`, `license_id` (FK), `assignee_email`
  (PARTECIPANTE del singolo posto, può differire dall'acquirente), `expires_at`,
  `used`, `used_at`
- **`license_consents`** — consenso condizioni d'uso **per PUK**: `puk_code`,
  `license_id`, `app_code`, `language`, `terms_version`
- **`video_progress`** — PK `(puk_code, module_key)`, colonna `completed`:
  **unica fonte di verità del progresso video**
- **`certificates`** — `puk_code`, `certificate_number`: un certificato per PUK

`app_code` è il codice nudo (`01-GDPR-00`); il campo `code` di
`product_catalog` include il suffisso di validità (`01-GDPR-00-03`).

---

## 4. Funnel

```text
/auth                 → inserimento email
/auth/verifica        → OTP → sessionStorage.verified_email
/attivazione          → form licenza+PUK, o scorciatoia sicura per email nota
/termini              → consenso condizioni d'uso (per PUK, 4 lingue)
/dati-attestato       → anagrafica (nome, CF, ditta)
/corso                → 2 video sequenziali (Modulo 1 / Modulo 2)
/test                 → 3 domande, soglia 2/3
/attestato            → PDF + QR + email via Resend
/corso-gia-completato → PUK con certificato già emesso
/                     → landing (nessun PUK valido) o dashboard (PUK valido)
```

Un file per pagina in `src/routes/<nome>.tsx`; i punti nel nome indicano nesting.

---

## 5. Gate unico server-side: `getFunnelStatus`

File: `src/lib/funnel-guard.functions.ts`.

```ts
getFunnelStatus({ puk }) → {
  valid: boolean;        // PUK esiste e non scaduto; licenza attiva e non scaduta
  reason: string | null; // es. "puk_non_trovato", "licenza_scaduta"
  module1: boolean;      // da video_progress
  module2: boolean;
  certified: boolean;    // certificato già esistente per il PUK
}
```

Chiamata a **ogni mount** di `corso.tsx`, `test.tsx`, `index.tsx`.
Comportamento standard:

- `puk === "no-puk"` → redirect `/attivazione`
- `!valid` → redirect `/attivazione`
- `certified` (fuori da `/attestato`) → redirect `/corso-gia-completato`
- altrimenti `module1`/`module2` decidono cosa è sbloccato

`currentPuk()` (esportata da `src/components/VideoLesson.tsx`) risolve il PUK
candidato con fallback a 3 livelli: `sessionStorage.activation` →
`localStorage.attestato_data` → `localStorage.lastActivation`. Il fallback è
voluto (recupero attestato da un altro browser); la sicurezza sta nel
rivalidarlo sempre con `getFunnelStatus`, mai nel vietarlo.

---

## 6. Regole da rispettare in ogni intervento futuro

1. Ogni pagina protetta rivalida il PUK con `getFunnelStatus` al mount; nessun
   gate basato su `localStorage`/`sessionStorage`.
2. Il progresso video si legge e si scrive solo tramite
   `src/lib/video-progress.functions.ts` (tabella `video_progress`, per PUK).
3. Le scorciatoie "email già nota" risolvono il PUK **lato server** con
   `findActiveLicenseByEmail` e impostano `activation`/`lastActivation` prima di
   avanzare nel funnel. Mai saltare passaggi senza aver impostato un PUK.
4. Le server function toccano Supabase solo via
   `await import("@/integrations/supabase/client.external")` (`supabaseExternal`),
   mai il client Lovable Cloud di default.
5. Il corso è solo in italiano: mantenere `lang="it"`, `translate="no"` e
   `<meta name="google" content="notranslate">` in `src/routes/__root.tsx`
   (la traduzione automatica del browser rompe il DOM gestito da React).
6. Dopo l'emissione del certificato si ripuliscono le chiavi
   `completed_*`/`progress_*`/`max_progress_*` del PUK, ma **non**
   `attestato_data`/`lastActivation` (servono al recupero attestato).
7. Un commit su GitHub non aggiorna il sito: serve sempre **Publish** da Lovable.

---

## 7. File di riferimento

| File | Ruolo |
|---|---|
| `src/lib/funnel-guard.functions.ts` | `getFunnelStatus` — gate server unico |
| `src/lib/video-progress.functions.ts` | `markVideoCompleted`, `getVideoProgress` |
| `src/lib/license.functions.ts` | `verifyAndActivateLicense` |
| `src/lib/certificate.functions.ts` | `checkCertificateByPuk`, `saveCertificate` |
| `src/lib/consent.functions.ts` | `checkTermsConsent`, `recordTermsConsent` |
| `src/lib/course.server.ts` / `course.functions.ts` | `findActiveLicense`, `findActiveLicenseByEmail` — scorciatoia email→PUK sicura (codice del fix 2026-08-06) |
| `src/components/VideoLesson.tsx` | player video, `currentPuk()`, `isLessonCompleted()` |
| `src/routes/index.tsx`, `attivazione.tsx`, `corso.tsx`, `test.tsx`, `attestato.tsx` | pagine del funnel (§4) |
| `src/routes/__root.tsx` | head/meta globali, `notranslate` |

### Costanti

- `APP_CODE = "01-GDPR-00"` (`src/lib/app-config.ts`) — da cambiare in
  `"02-GDPR-00"` sul repo gemello, insieme a nome corso, dominio e titoli `<head>`
- `LESSON_1 = "lezione1"`, `LESSON_2 = "lezione2"` — moduli fissi
- `TERMS_VERSION` — incrementarla forza una nuova accettazione per tutti i PUK

---

## 8. Attività aperte

1. Duplicare questa architettura su `02-GDPR-00`, sostituendo
   `app_code`/nome corso/dominio — **senza toccare** `attestato.tsx` né i
   template email di quell'app.
2. Sostituire i video segnaposto con i video reali.
3. Riscrivere le domande del test (entrambe le app).
4. Estendere il pattern PUK-sicuro (`getFunnelStatus`) alle altre app del
   portfolio: `001SmMntnnc`, `002MnFAT`, `011PedFlow`.
5. Eventuale pulizia di codice non più usato: da valutare **riga per riga e con
   conferma esplicita**, mai per file intero. In particolare
   `src/lib/course.server.ts` e `src/lib/course.functions.ts` contengono
   `findActiveLicense`/`findActiveLicenseByEmail`, che sono parte del fix di
   sicurezza del 2026-08-06 e non vanno rimosse.
6. Decidere se rimuovere dal DB condiviso le tabelle create ma non utilizzate da
   questa app.
