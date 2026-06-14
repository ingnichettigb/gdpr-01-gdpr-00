## Obiettivo

Spostare la raccolta dati (nome, ditta, luogo/data nascita, codice fiscale) **all'inizio del flusso**, prima del corso. Il bottone "Reset Primo Accesso" deve riportare a quella schermata iniziale, **pre-compilando** i campi con gli ultimi dati salvati così l'utente può semplicemente confermarli senza riscriverli.

## Cosa cambierà

### 1. Nuova schermata di onboarding su `/` (home)
- La pagina `/` (oggi dashboard del corso) diventa la **schermata di inserimento dati** finché l'utente non li ha confermati.
- Form identico a quello oggi in `/attestato`:
  - Nome e cognome (obbligatorio)
  - Nome della ditta (obbligatorio)
  - Luogo di nascita
  - Data di nascita
  - Codice fiscale (obbligatorio, sempre in MAIUSCOLO)
  - Avviso responsabilità + checkbox di conferma
- Al submit, i dati vengono salvati su `localStorage` con la stessa chiave `attestato_data` già usata oggi, così `/attestato` li riusa senza richiederli di nuovo.
- Dopo il submit, l'utente vede la **dashboard del corso** (l'attuale contenuto di `/`) con il pulsante "Inizia il corso".

### 2. Pagina `/attestato`
- Continua a leggere `attestato_data` dal `localStorage`: visto che i dati sono già stati raccolti all'inizio, il form **non verrà più mostrato** in `/attestato`. Si va direttamente all'attestato (previa verifica test superato).
- Se per qualche motivo i dati mancano, fallback: reindirizza a `/` per inserirli.

### 3. Bottone "Reset Primo Accesso" (in `__root.tsx`)
- Conferma con `window.confirm`.
- **Salva una copia** degli ultimi dati utente (`attestato_data`) in una chiave separata `attestato_data_last` PRIMA di pulire.
- Cancella `localStorage` (progresso corso, punto video, `test_passed`, `attestato_data`), `sessionStorage` e cookie.
- Ripristina `attestato_data_last` come `attestato_prefill` (chiave dedicata, NON `attestato_data`, così l'utente deve comunque confermare).
- Reindirizza con `window.location.href = "/"`.

### 4. Pre-compilazione del form
- Al mount, il form su `/` controlla nell'ordine:
  1. `attestato_data` → se presente, l'onboarding è già stato fatto, mostra direttamente la dashboard del corso.
  2. `attestato_prefill` → se presente (caso post-reset), pre-popola i campi del form e pre-spunta la checkbox di conferma, così basta cliccare "Conferma e inizia" per procedere.
  3. Altrimenti, form vuoto.

## Dettagli tecnici

- **File modificati**: `src/routes/index.tsx`, `src/routes/attestato.tsx`, `src/routes/__root.tsx`.
- **Chiavi localStorage**:
  - `attestato_data` (esistente) — dati confermati dell'utente attivo.
  - `attestato_prefill` (nuova) — copia conservata dal reset per pre-popolare il form.
- **`/attestato`**: rimuovo il blocco del form (righe ~81-183) e gli stati `form`/`accepted`. Mantengo solo il rendering dell'attestato e il redirect a `/` se `attestato_data` manca.
- **`/` (index)**: aggiungo stato `data` letto da `localStorage`. Se assente, render del form (componente estratto o inline). Se presente, render dell'attuale dashboard.
- **Reset**: prima di `localStorage.clear()`, leggo `attestato_data` e, se presente, lo riscrivo come `attestato_prefill` dopo il clear.

## Cosa NON cambia

- Logica del corso (`/corso`), del test (`/test`) e del rendering dell'attestato (fronte/retro).
- Stile e layout esistenti.
- La chiave `test_passed` continua a gate l'accesso all'attestato.
