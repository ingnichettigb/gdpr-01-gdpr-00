# Piano: salvare numero certificato su Supabase con licenza

## 1. Connessione al Supabase esistente

Il progetto attualmente NON è collegato a nessun backend (solo localStorage). Per collegarlo al tuo Supabase esistente mi servono **2 valori** che mi devi incollare in chat:

1. **Project URL** — es. `https://xxxxx.supabase.co` (Supabase Dashboard → Project Settings → API → Project URL)
2. **Publishable / anon key** — la chiave `anon public` (Settings → API → Project API keys → `anon` `public`)

⚠️ NON inviare la `service_role` key. È segreta e non serve lato app.

Creerò:
- `src/integrations/supabase/client.ts` con quei valori
- `package.json`: `bun add @supabase/supabase-js`

## 2. Migration SQL (te la fornisco da eseguire nel tuo Supabase)

Visto che il DB non è gestito da Lovable, ti darò lo script SQL da incollare nel SQL Editor del tuo Supabase:

```sql
-- A) Nuove colonne immutabili su public.certificates
ALTER TABLE public.certificates
  ADD COLUMN IF NOT EXISTS certificate_number text UNIQUE,
  ADD COLUMN IF NOT EXISTS license_id uuid REFERENCES public.licenses(id),
  ADD COLUMN IF NOT EXISTS license_key  text,
  ADD COLUMN IF NOT EXISTS nome_snapshot text,
  ADD COLUMN IF NOT EXISTS cf_snapshot   text,
  ADD COLUMN IF NOT EXISTS ditta_snapshot text,
  ADD COLUMN IF NOT EXISTS luogo_nascita_snapshot text,
  ADD COLUMN IF NOT EXISTS data_nascita_snapshot date;

-- user_id e course_id sono NOT NULL nello schema attuale ma non abbiamo
-- login: li rendiamo nullable per permettere l'inserimento anonimo
ALTER TABLE public.certificates
  ALTER COLUMN user_id DROP NOT NULL,
  ALTER COLUMN course_id DROP NOT NULL,
  ALTER COLUMN pdf_url DROP NOT NULL;

-- B) Trigger immutabilità: blocca UPDATE su certificate_number / issued_at
CREATE OR REPLACE FUNCTION public.certificates_immutable_fields()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.certificate_number IS DISTINCT FROM OLD.certificate_number
     OR NEW.issued_at IS DISTINCT FROM OLD.issued_at
     OR NEW.license_id IS DISTINCT FROM OLD.license_id
     OR NEW.cf_snapshot IS DISTINCT FROM OLD.cf_snapshot
     OR NEW.nome_snapshot IS DISTINCT FROM OLD.nome_snapshot THEN
    RAISE EXCEPTION 'Campi del certificato non modificabili dopo l''emissione';
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_certificates_immutable ON public.certificates;
CREATE TRIGGER trg_certificates_immutable
  BEFORE UPDATE ON public.certificates
  FOR EACH ROW EXECUTE FUNCTION public.certificates_immutable_fields();

-- C) RLS: insert pubblico, no update/delete dall'app
ALTER TABLE public.certificates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon insert cert" ON public.certificates;
CREATE POLICY "anon insert cert" ON public.certificates
  FOR INSERT TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon read own cert" ON public.certificates;
CREATE POLICY "anon read own cert" ON public.certificates
  FOR SELECT TO anon, authenticated USING (true);

GRANT SELECT, INSERT ON public.certificates TO anon, authenticated;
GRANT SELECT ON public.licenses TO anon, authenticated;
```

> Sulla `licenses` serve almeno il SELECT per anon per poter validare la `license_key`. Se preferisci che la validazione passi da una RPC `security definer` (più sicura, non espone la tabella), dimmelo e cambio approccio.

## 3. Modifiche all'app

### `src/routes/index.tsx` (form iniziale)
Aggiungo campo **"Codice licenza"** (obbligatorio). Al submit:
- `supabase.from('licenses').select('id, is_active, expires_at').eq('license_key', key).maybeSingle()`
- Se non trovata / non attiva / scaduta → errore inline, non si procede.
- Salvo `license_id` e `license_key` in `localStorage` insieme agli altri dati.

### `src/routes/test.tsx` (al superamento)
Quando `test_passed = true` e non esiste già un cert:
1. Genero `certificate_number = AAAAMMGGHHmmss` (come ora).
2. INSERT su `public.certificates` con:
   - `certificate_number`, `license_id`, `license_key`
   - `nome_snapshot`, `cf_snapshot`, `ditta_snapshot`, `luogo_nascita_snapshot`, `data_nascita_snapshot`
   - `issued_at = now()` (server-side default)
3. Rileggo `issued_at` dal record inserito e salvo `attestato_cert_number` + `attestato_issued_at` in `localStorage`.
4. In caso di errore DB: mostro alert ma comunque salvo localmente, così l'utente non resta bloccato.

### `src/routes/attestato.tsx`
- Usa **sempre** `attestato_cert_number` e `attestato_issued_at` da localStorage (popolati dal test). La data nel PDF/UI diventa `issued_at` del DB (non `new Date()` corrente), così non cambia mai.
- Il PDF mantiene il numero esistente.

### `src/lib/generateAttestatoPdf.ts`
- Riceve `issuedAt: string` come parametro e lo usa al posto di `new Date()`.

## 4. Cosa NON faccio
- Non tocco `user_id` (resta nullable senza login).
- Non creo nuovi `auth.users`.
- Non cambio lo schema di `licenses` né di altre tabelle.

## 5. Domande residue
- Va bene esporre SELECT su `licenses` ad `anon` (limitato a id/stato) o preferisci una **RPC `validate_license(key)`** che ritorna solo `{ valid, license_id }`? **Più sicura ma richiede 1 funzione SQL in più.**
- Il **course_id** lo lascio NULL o vuoi che inserisca un UUID fisso del corso GDPR (allora dimmi quale riga di `public.courses` usare)?

Appena mi confermi (e mi passi URL + anon key) procedo.