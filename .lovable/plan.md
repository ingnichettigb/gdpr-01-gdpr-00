## Fix bottone "Test finale" nel carosello

**Problema:** in `src/routes/corso.tsx`, quando entrambi i moduli sono completati (`c1 && c2`), cliccando lo step "Test finale" nel carosello viene mostrato solo il pannello interno con il pulsante "Vai al test", ma l'utente si aspetta di essere portato direttamente a `/test` (come da bottone "Vai al test").

**Modifica:**
Nel carosello step, se `s.key === "test"` e lo step è sbloccato (`c1 && c2`), renderizzare un `<Link to="/test">` al posto del `<button>` che cambia `active`. Nessun'altra logica toccata (moduli 1/2 continuano a comportarsi come oggi: click = riapri per rivedere).

## Archivio attestati — dove viene creato

Attualmente NON esiste una pagina "archivio". I certificati vengono:

- **Persistiti** su Supabase nella tabella `public.certificates` (vedi `src/routes/test.tsx` righe ~129-152 e `docs/migration_certificates.sql`) al superamento del test, con `certificate_number`, dati anagrafici e `issued_at` immutabili (trigger `certificates_immutable_fields`).
- **Riferiti in locale** via `localStorage` (`attestato_cert_number`, `attestato_cert_id`, `attestato_issued_at`, `attestato_data`) per permettere a `/attestato` di rigenerare il PDF.
- **Generati come PDF** on-demand da `src/lib/generateAttestatoPdf.ts` (download immediato, nessun file salvato server-side).

Non c'è quindi un "archivio" navigabile: la fonte di verità è la tabella `certificates` su Supabase. Se vuoi una pagina tipo `/attestati` che elenchi i certificati emessi (es. per l'utente o per admin), dimmelo e la aggiungo in un plan separato.