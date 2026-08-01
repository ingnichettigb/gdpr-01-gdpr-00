-- Da eseguire nel progetto Supabase ESTERNO (ruopxyprezzxoirfrjrm).
-- Collega identita' utente (public.users) e tabelle corso al frontend.

-- 1. Identita' utente applicativa (l'app non usa Supabase Auth: nessun auth.uid()).
create table if not exists public.users (
  id uuid primary key default gen_random_uuid(),
  email text unique not null,
  created_at timestamptz default now()
);

-- L'accesso avviene solo via service role (server functions): RLS attiva, nessuna policy.
alter table public.users enable row level security;
grant all on public.users to service_role;

-- 2. Il seat attivato (PUK) punta all'utente applicativo.
alter table public.puk_codes add column if not exists user_id uuid;

-- 3. Mappatura app -> corso (unico punto di collegamento app_code / course_id).
alter table public.courses add column if not exists app_code text;

-- Valorizzare app_code sulla riga del corso gestito da questa app:
-- update public.courses set app_code = '01-GDPR-00' where id = '<UUID DEL CORSO>';

-- 4. Upsert idempotenti sull'avanzamento per (user_id, module_id).
create unique index if not exists course_progress_user_module_uidx
  on public.course_progress (user_id, module_id);
