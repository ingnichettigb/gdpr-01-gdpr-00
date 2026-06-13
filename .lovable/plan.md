## Modifiche all'attestato

### 1. Form raccolta dati (prima di generare l'attestato)
Aggiungo un nuovo campo obbligatorio **"Nome della ditta"** (es. "ACME S.r.l.") al form esistente che chiede già: nome e cognome, luogo di nascita, data di nascita, codice fiscale.

Il campo **Codice Fiscale** verrà:
- Forzato in **MAIUSCOLO** in tempo reale durante la digitazione (`toUpperCase()` sull'onChange)
- Mostrato sempre in maiuscolo ovunque venga stampato

Prima del pulsante "Genera attestato" aggiungo un **avviso di responsabilità** con checkbox obbligatoria di accettazione:

> ⚠️ I dati inseriti sono sotto la responsabilità esclusiva di chi li compila. Eventuali errori di digitazione **non potranno essere corretti** una volta generato l'attestato. Verificare attentamente nome, codice fiscale e nome della ditta prima di proseguire.

Il pulsante "Genera attestato" resta disabilitato finché la checkbox non è spuntata.

### 2. Fronte dell'attestato
Sotto al nome e cognome del partecipante aggiungo una riga dedicata al **Codice Fiscale in maiuscolo**, ben visibile (es. `C.F. RSSMRA85T10A562S`), separata dai dati di nascita che restano sotto.

In **fondo all'attestato** (sopra alla riga data/firma) aggiungo il testo richiesto, con il nome ditta inserito al posto dei segnaposto:

> *"La formazione è stata erogata da **{NOME DITTA}** e sviluppata in coerenza con il programma generale e con le direttive operative, le procedure, le nomine e le informative emanate dal Titolare e dal Responsabile Privacy; pertanto il presente attestato è valido esclusivamente come supporto al sistema privacy adottato dalla società **{NOME DITTA}**."*

Per far stare tutto nella stessa pagina A4 orizzontale ridurrò leggermente alcuni margini/font del fronte.

### 3. Persistenza
Il `localStorage` (chiave `attestato_data`) viene esteso con il campo `ditta`. Gli utenti che hanno già un attestato salvato senza ditta vedranno di nuovo il form per completarlo.

### Dubbio
Non chiedo nulla: la richiesta è chiara. Procedo così quando passi in build mode.
