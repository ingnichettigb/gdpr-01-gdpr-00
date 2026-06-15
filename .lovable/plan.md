# Piano: Numero certificato + Download PDF protetto

## Obiettivo
1. Generare un numero certificato univoco (formato `AAAAMMGGHHmmss`) al momento del superamento del test.
2. Mostrarlo sul fronte dell'attestato sotto "Guida Pratica per l'Addetto e l'Incaricato".
3. Sostituire il bottone "Stampa / PDF" con "Scarica PDF" che genera un vero PDF in **sola lettura** (non modificabile) includendo **tutti** i testi visibili a video — incluso il paragrafo "La formazione è stata erogata da {DITTA}…" che oggi manca nella stampa.

## Modifiche

### 1. `src/routes/test.tsx`
Al momento in cui viene impostato `test_passed = true`, generare e salvare il numero certificato:
- Chiave localStorage: `attestato_cert_number`
- Solo se non già presente (così non cambia se l'utente riapre il test).
- Formato: `AAAAMMGGHHmmss` (es. `20260615142307`) calcolato da `new Date()` locale.

### 2. `src/routes/attestato.tsx`
- Leggere `attestato_cert_number` da localStorage. Fallback: se manca (utente vecchio), generarlo al volo alla prima apertura e salvarlo.
- Renderizzare sul **fronte**, subito sotto la riga gialla "Guida Pratica per l'Addetto e l'Incaricato":
  `Certificato n. {NUMERO}`
- Sostituire il bottone "Stampa / PDF" con **"Scarica PDF"** (icona Download). Rimuovere `window.print()` e il blocco `<style>` con le print rules (non più necessari).
- Il bottone chiama la funzione di generazione PDF.

### 3. Nuovo file `src/lib/generateAttestatoPdf.ts`
Funzione client-side che usa **`pdf-lib`** per costruire un PDF A4 landscape a 2 pagine:
- **Pagina 1 (Fronte)**: header "Corporate Boost Service", titolo "Attestato di Partecipazione", nome, CF, luogo/data nascita, descrizione corso, titolo corso GDPR, "Guida Pratica…", **"Certificato n. {NUMERO}"**, **paragrafo completo "La formazione è stata erogata da {DITTA}…società {DITTA}"** (con word-wrap), data rilascio, firma "Corporate Boost Service".
- **Pagina 2 (Retro)**: titolo "Argomenti del Corso", i 7 gruppi di argomenti con elenchi puntati, footer con data.
- Bordi doppi verde smeraldo per coerenza visiva.
- **Protezione sola lettura** via `PDFDocument.save({ useObjectStreams: false })` + encrypt:
  - User password: vuota (apertura libera)
  - Owner password: stringa random
  - Permessi: solo `printing` consentito; **negati**: `modifying`, `copying`, `annotating`, `fillingForms`, `contentAccessibility`, `documentAssembly`.
- Download via `Blob` + `<a download>` con nome `Attestato_{NOME_SLUG}_{CERT}.pdf`.

### 4. `package.json`
Aggiungere dipendenza `pdf-lib` (`bun add pdf-lib`).

## Dettagli tecnici
- Numero certificato: `const pad = (n:number)=>String(n).padStart(2,'0'); const d=new Date(); const cert = ${'`${d.getFullYear()}${pad(d.getMonth()+1)}${pad(d.getDate())}${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`'};`
- `pdf-lib` è puro JS, funziona client-side, supporta encryption con permessi.
- Font: Helvetica/Helvetica-Bold (standard pdf-lib, no embedding necessario).
- Reset Primo Accesso: continua a cancellare tutto incluso `attestato_cert_number` (già coperto da `localStorage.clear()`).

## Domande aperte
Nessuna — procedo con queste scelte.
