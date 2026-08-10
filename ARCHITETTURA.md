# Architettura — 01-GDPR-00 "Corso My Privacy"

> Documento di riferimento tecnico. Aggiornato: 2026-08-06.
> Repo: `ingnichettigb/gdpr-01-gdpr-00` · Dominio: `01-gdpr-00.corporateboostservice.eu`
> Checkpoint stabile: tag Git `checkpoint-20260806-funnel-security-fix`

Questo documento esiste perché il 2026-08-05/06 una sessione Lovable **parallela e
scollegata da questa cronologia** ha riscritto autonomamente parti del funnel
verso un'architettura incompatibile (`course_progress`/`public.users`/`userId`),
causando 4 incidenti in produzione. Il file `.lovable/plan.md` in questo repo è
il piano di quella sessione: **è superato, va ignorato, non va implementato.**
Questo documento descrive invece l'architettura realmente in uso oggi.

---

## 1. Contesto di prodotto

App di e-learning GDPR ("Corso My Privacy"), gemella di `02-GDPR-00` ("Corso
Privacy Addetto", repo `ingnichettigb/02-gdpr-00`). Entrambe fanno parte del
portfolio CorporateBoostService (Dott. Ing. Nichetti Gian Battista), che
condivide un unico progetto Supabase (`ruopxyprezzxoirfrjrm`) fra 14+ prodotti.

Stack: Lovable (React + TanStack Start/Router) · Supabase (DB esterno condiviso)
· Resend (email) · Paddle (pagamenti, non ancora attivo su questa app) ·
Cloudflare (DNS/CDN) · GitHub.

**Stato contenuti (2026-08-06)**: entrambe le app sono "embrionali" sui
contenuti — video segnaposto (`w3schools.com`), test da riscrivere, differenti
solo per nome/dominio/`app_code`. L'architettura tecnica descritta qui è
invece considerata stabile e va **duplicata identica** su `02-GDPR-00`.

---

## 2. Identità e sessione — NON Supabase Auth

L'app **non usa** `supabase.auth`. L'identità è interamente basata su:

1. **OTP via email** (`lead_emails`, non un vero login) → `sessionStorage.verified_email`
2. **Licenza + PUK** (multi-seat) → `sessionStorage.activation` / `localStorage.lastActivation`

`auth.uid()` lato Supabase è quindi **sempre null**. Qualsiasi controllo basato
su `supabase.auth.getUser()` non funziona e va evitato (era uno degli errori
del piano abbandonato).

### Chiavi browser in uso

| Chiave | Storage | Scopo | Scritta da |
|---|---|---|---|
| `verified_email` | sessionStorage | email confermata via OTP nella sessione corrente | `auth.verifica.tsx` |
| `activation` | sessionStorage | `{licenseId, licenseKey, puk, userId?}` della sessione corrente | `attivazione.tsx` |
| `lastActivation` | localStorage | stessa struttura, **persiste per sempre** — usata per il recupero cross-browser/cross-sessione | `attivazione.tsx` |
| `attestato_data` | localStorage | dati anagrafici + puk, per rigenerare/rivedere l'attestato | `dati-attestato.tsx` |
| `completed_{PUK}_{lezione}` | localStorage | flag locale "video visto" (cache, non fonte di verità) | `VideoLesson.tsx` |
| `progress_{PUK}_{lezione}` / `max_progress_{PUK}_{lezione}` | localStorage | posizione di ripresa video, anti-skip | `VideoLesson.tsx` |
| `attestato_cert_number_{PUK}` / `_cert_id_` / `_issued_at_` | localStorage | cache locale del certificato già generato | `test.tsx` |
| `test_passed_{PUK}` | localStorage | flag locale test superato | `test.tsx` |

**Importante**: dopo l'incidente di sicurezza del 2026-08-06 (vedi §6), **nessuna
di queste chiavi è più, da sola, sufficiente a concedere accesso a corso/test/
dashboard**. Sono cache per l'esperienza utente; il gate reale è sempre una
rivalidazione server-side (`getFunnelStatus`, vedi §5).

---

## 3. Modello dati — licenze multi-seat (fonte di verità, Supabase)

Pattern condiviso con le altre app del portfolio: **1 licenza → N PUK**.

- **`licenses`**: `id`, `license_key`, `user_email` (email dell'ACQUIRENTE, non del
  partecipante), `is_active`, `expires_at`, `app_code`
- **`puk_codes`**: `id`, `code` (il PUK), `license_id` (FK), `assignee_email`
  (email del PARTECIPANTE per quel singolo posto — può differire dal
  compratore), `expires_at`, `used`, `used_at`
- **`license_consents`**: consenso condizioni d'uso **per PUK** (non per
  licenza), colonne `puk_code`, `license_id`, `app_code`, `language`,
  `terms_version`
- **`video_progress`**: chiave primaria `(puk_code, module_key)`, colonna
  `completed` — fonte di verità server-side del progresso video, **indipendente**
  da `course_progress`/`public.users` (che non vanno usate, vedi §7)
- **`certificates`**: `puk_code`, `certificate_number` — un certificato per PUK
- **`participant_data`** *(dal 2026-08-08)*: `puk_code` (PK, FK → `puk_codes.code`),
  `nome`, `cf`, `ditta`, `luogo_nascita`, `data_nascita` — anagrafica del
  partecipante salvata **prima** della generazione del certificato (che la
  duplica come snapshot in `certificates` solo a corso completato). Permette
  il recupero cross-browser dei dati anche a metà percorso, senza dover
  ripassare da `/dati-attestato`. Vedi `docs/migration_participant_data.sql`
  e `src/lib/participant-data.functions.ts`
  (`getParticipantData`/`saveParticipantData`).

`app_code` è sempre il codice nudo (`01-GDPR-00`); il campo `code` di
`product_catalog` include il suffisso di validità (`01-GDPR-00-03`) — non
confonderli.

---

## 4. Percorso utente (funnel) e file corrispondenti

```
/auth              → inserimento email
/auth/verifica      → OTP, scrive sessionStorage.verified_email
/attivazione        → form licenza+PUK, oppure scorciatoia sicura per email
                      già nota (vedi §6.2) — scrive activation/lastActivation
/termini            → consenso condizioni d'uso (per PUK, 4 lingue)
/dati-attestato      → anagrafica (nome, CF, ditta)
/corso              → 2 video sequenziali (Modulo 1 / Modulo 2)
/test               → 3 domande, soglia 2/3
/attestato          → PDF + QR + email automatica via Resend
/corso-gia-completato → redirect quando il PUK ha già un certificato
/                   → landing (nessun PUK valido) o dashboard (PUK valido)
```

File chiave per pagina: `src/routes/<nome>.tsx` (routing a file di TanStack
Router — i punti nel nome, es. `accesso.attiva.tsx`, indicano nesting).

---

## 5. Verifica server-side unica — `getFunnelStatus`

**File**: `src/lib/funnel-guard.functions.ts`

Fonte di verità unica per "questo PUK, adesso, è legittimo?". Chiamata a
**ogni mount** di `corso.tsx`, `test.tsx`, `index.tsx` (e usata concettualmente
anche nella scorciatoia di `attivazione.tsx`).

```ts
getFunnelStatus({ puk: string }) → {
  valid: boolean;        // PUK esiste, non scaduto; licenza collegata attiva, non scaduta
  reason: string | null; // es. "puk_non_trovato", "licenza_scaduta"
  module1: boolean;      // da video_progress, non da localStorage
  module2: boolean;
  certified: boolean;    // esiste già un certificato per questo PUK
}
```

Comportamento standard nelle pagine che la chiamano:
- `puk === "no-puk"` (nessun candidato risolvibile) → redirect `/attivazione`
- `!valid` → redirect `/attivazione`
- `certified === true` (e la pagina non è `/attestato`) → redirect `/corso-gia-completato`
- altrimenti → `module1`/`module2` decidono cosa mostrare/sbloccare

**`currentPuk()`** (in `src/components/VideoLesson.tsx`, esportata) risolve il
PUK "candidato" con fallback a 3 livelli: `sessionStorage.activation` →
`localStorage.attestato_data` → `localStorage.lastActivation`. Questo fallback
è **voluto** (recupero attestato da un browser diverso) — la sicurezza non sta
nel vietarlo ma nel **rivalidarlo sempre** con `getFunnelStatus` prima di
fidarsene.

---

## 6. Incidente di sicurezza 2026-08-06 — cosa è stato corretto

### 6.1 Bypass del funnel (corso.tsx / test.tsx)
**Sintomo**: un browser con un PUK vecchio già completato, in una tab nuova,
arrivava dritto al test/attestato saltando licenza/PUK/onboarding.
**Causa**: `isLessonCompleted()` leggeva solo `localStorage`, senza mai
verificare col server se il PUK risolto da `currentPuk()` fosse ancora valido.
**Fix**: introdotto `getFunnelStatus` (§5), applicato in `corso.tsx` e
`test.tsx` ad ogni mount.

### 6.2 Identity-crossover (index.tsx / attivazione.tsx)
**Sintomo**: su un browser condiviso, chiunque facesse il *proprio* OTP con la
*propria* email veniva mandato dritto nella dashboard/corso di **chi aveva
usato quel browser in precedenza**, senza nessun controllo.
**Causa**: `getUserId()` (`src/lib/activation.ts`) leggeva `localStorage.
lastActivation.userId` **senza nessun legame con l'email appena verificata**,
sia in `index.tsx` (mostra dashboard) sia in `attivazione.tsx` (salta il
form). Il ramo "email con licenza attiva" in `attivazione.tsx` mandava a
`/corso` **senza mai impostare un PUK**, quindi era anche funzionalmente rotto
(rischio di loop).
**Fix**:
- `index.tsx`: la dashboard si mostra solo se `currentPuk()` + `getFunnelStatus`
  confermano un PUK valido *adesso* — mai più da `getUserId()` da solo.
- `attivazione.tsx`: rimosso lo skip cieco. La scorciatoia per email già nota
  ora chiama `findActiveLicenseByEmail` (`src/lib/course.server.ts`), che
  risolve **lato server** il PUK realmente assegnato a quell'email
  (`puk_codes.assignee_email`, o l'unico PUK se posto singolo), imposta
  `activation`/`lastActivation` corretti, e solo allora salta al passo giusto
  (`/termini` o `/attestato`).

### 6.3 Pulizia locale post-attestato
`test.tsx`, dopo aver salvato il certificato, ora rimuove le chiavi
`completed_*`/`progress_*`/`max_progress_*` di quel PUK (igiene: quel gate
ora dipende comunque dal server, non da queste chiavi). Non tocca
`attestato_data`/`lastActivation` (servono al recupero attestato).

### 6.4 Pulsante "Esci" reale
`attestato.tsx` → pulsante "Esci — cancella dati da questo browser":
conferma, cancella `sessionStorage` + tutte le chiavi locali del PUK, poi
`window.close()` con fallback a `/` (che con i dati cancellati mostra la
landing, stato "sloggato"). Diverso dal preesistente "Torna alla dashboard"
(che invece riporta alla dashboard dello stesso PUK, non pulisce nulla) —
funzionante solo dopo il fix di `index.tsx` in §6.2, prima puntava a una
home rotta.

### 6.5 Traduzione automatica browser
`Failed to execute 'removeChild' on 'Node'` in Chrome/Edge era causato dalla
traduzione automatica che tocca il DOM gestito da React. Corso solo in
italiano → aggiunto `<meta name="google" content="notranslate">` e
`translate="no"` su `<html>` in `src/routes/__root.tsx` (anche `lang`
corretto da `"en"` a `"it"`).

---

## 7. Sistema ABBANDONATO — da non implementare

Il file `.lovable/plan.md` e il file `docs/migration_users_courses.sql`
descrivono un secondo sistema di tracking, mai completato e mai testato,
basato su:

- tabella `public.users` (con `id` come chiave, non collegata a PUK)
- tabella `course_progress` (per `userId`+`moduleId`)
- tabella `course_tests`, `course_modules`, `courses` (con `course_id`)
- `supabase.auth.getUser()` in `index.tsx` (non funziona: `auth.uid()` è
  sempre null in questa app)

Queste tabelle **esistono nel database** (creazione partita da quel piano) ma
**non vanno usate**: il sistema realmente in uso è `video_progress` scopato
per `puk_code` (§3). Non collegare nuovo codice a `course_progress`/`users`/
`course_modules` senza discuterne prima — è la causa diretta di 3 incidenti
su 4 del 2026-08-06.

---

## 8. File di riferimento rapido

| File | Ruolo |
|---|---|
| `src/lib/funnel-guard.functions.ts` | `getFunnelStatus` — verifica server unica |
| `src/lib/video-progress.functions.ts` | `markVideoCompleted`, `getVideoProgress` (tabella `video_progress`) |
| `src/lib/license.functions.ts` | `verifyAndActivateLicense` (attivazione PUK) |
| `src/lib/certificate.functions.ts` | `checkCertificateByPuk`, `saveCertificate` |
| `src/lib/consent.functions.ts` | `checkTermsConsent`, `recordTermsConsent` |
| `src/lib/participant-data.functions.ts` | `getParticipantData`/`saveParticipantData` — anagrafica per PUK, pre-certificato (dal 2026-08-08) |
| `src/lib/course.server.ts` / `course.functions.ts` / `course.types.ts` | `findActiveLicense`/`findActiveLicenseByEmail` (scorciatoia email→PUK sicura) |
| `src/lib/activation.ts` | `getUserId()` — solo lettura cache locale, **mai** usata da sola come gate di sicurezza |
| `src/components/VideoLesson.tsx` | player video, `currentPuk()` (esportata), `isLessonCompleted()` |
| `src/routes/corso.tsx`, `test.tsx`, `attivazione.tsx`, `index.tsx`, `attestato.tsx` | vedi §4/§6 |
| `src/routes/__root.tsx` | head/meta globali, `notranslate` |

### Costanti chiave
- `APP_CODE = "01-GDPR-00"` (`src/lib/app-config.ts`) — **va cambiato in
  `"02-GDPR-00"` quando si duplica su quel repo**, insieme a nome corso,
  dominio, titoli `<head>`
- `LESSON_1 = "lezione1"`, `LESSON_2 = "lezione2"` — moduli fissi del corso
- `TERMS_VERSION` (`app-config.ts`) — versione condizioni d'uso, incrementarla
  forza una nuova accettazione per tutti i PUK

---

## 9. Note operative

- **GitHub commit ≠ sito live**: serve sempre **Publish da Lovable** dopo un
  commit fatto fuori dall'editor.
- Tutte le server function toccano Supabase solo via `supabaseExternal`
  (`await import("@/integrations/supabase/client.external")`), mai il client
  Lovable Cloud di default — altrimenti le credenziali vengono sovrascritte.
- `raw.githubusercontent.com` ha una cache CDN di alcuni minuti: per
  verificare un commit appena fatto usare `api.github.com/repos/.../contents/...`
  (base64), non l'URL raw.

## 10. TODO aperti (stato 2026-08-08)

1. ~~Duplicare questa architettura su `02-GDPR-00`~~ — **fatto il 2026-08-07**
   (checkpoint `checkpoint-20260807-funnel-security-fix` su quel repo),
   inclusa la correzione di un bug critico specifico di 02 (test sempre
   bloccato, gate su `course_progress`/`userId` mai popolata)
2. Video reali (oggi placeholder `w3schools.com` su entrambe le app)
3. Riscrittura domande test per entrambe le app
4. Decidere se ripulire/rimuovere le tabelle del sistema abbandonato (§7) o
   lasciarle inutilizzate
5. Estendere `getFunnelStatus`/pattern PUK-sicuro alle altre app del
   portfolio (`001SmMntnnc`, `002MnFAT`, `011PedFlow`)
6. ~~Migrazione `participant_data`~~ — **eseguita il 2026-08-08** sul DB
   condiviso (vedi §3, `docs/migration_participant_data.sql`)
