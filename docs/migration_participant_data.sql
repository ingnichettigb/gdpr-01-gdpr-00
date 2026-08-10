-- Migrazione: dati anagrafici del partecipante, persistiti per PUK PRIMA
-- della generazione del certificato (che oggi li salva solo come snapshot
-- dentro certificates, quindi solo a corso completato).
--
-- Motivo: senza questa tabella, chi inserisce i dati anagrafici e poi
-- cambia browser/dispositivo prima di finire il test se li vede richiedere
-- di nuovo da zero — non c'era nessun posto su Supabase dove leggerli
-- indietro prima della generazione dell'attestato.
--
-- Condivisa tra 01-GDPR-00 e 02-GDPR-00 (stesso progetto Supabase, stesso
-- schema puk_codes). Eseguire UNA sola volta sul database condiviso.

create table if not exists public.participant_data (
  puk_code text primary key references public.puk_codes(code) on delete cascade,
  nome text not null,
  luogo_nascita text,
  data_nascita text,
  cf text not null,
  ditta text not null,
  updated_at timestamptz not null default now()
);

comment on table public.participant_data is
  'Dati anagrafici del partecipante, salvati per PUK durante /dati-attestato, prima della generazione del certificato. Permette il recupero cross-browser prima che il corso sia completato.';

-- Accesso solo via service_role (supabaseExternal dalle server function),
-- come le altre tabelle del funnel (video_progress, license_consents, ecc.).
-- Nessuna policy per anon/authenticated: RLS attivo blocca tutto il resto.
alter table public.participant_data enable row level security;

create index if not exists idx_participant_data_puk on public.participant_data (puk_code);
