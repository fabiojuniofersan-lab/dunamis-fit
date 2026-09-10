-- Dunamis Fit — estrutura do banco Supabase.
-- A autenticação continua sendo feita pelo Supabase Auth; segredos de servidor nunca ficam no navegador.
-- Para bancos já existentes, prefira as migrations aplicadas no projeto em vez de executar este arquivo novamente.

create extension if not exists pgcrypto;
create schema if not exists private;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role text not null default 'student' check (role in ('admin','student')),
  full_name text not null,
  email text not null unique,
  phone text,
  birth_date date,
  photo_url text,
  created_at timestamptz not null default now()
);

create table if not exists public.students (
  id uuid primary key references public.profiles(id) on delete cascade,
  plan text not null check (plan in ('3 dias por semana','4 dias por semana','5 dias por semana')),
  monthly_value numeric(10,2) not null,
  due_day integer not null check (due_day between 1 and 31),
  start_date date,
  payment_method text not null default 'Pix' check (payment_method in ('Pix','Dinheiro','Cartão')),
  status text not null default 'pending' check (status in ('paid','pending','late')),
  created_at timestamptz not null default now()
);

create table if not exists public.evaluations (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students(id) on delete cascade,
  evaluation_date date not null default current_date,
  weight numeric(6,2),
  height numeric(4,2),
  created_at timestamptz not null default now()
);

create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students(id) on delete cascade,
  amount numeric(10,2) not null,
  due_date date not null,
  paid_at timestamptz,
  method text check (method in ('Pix','Dinheiro','Cartão')),
  status text not null default 'pending' check (status in ('paid','pending','late')),
  gateway text,
  gateway_payment_id text,
  external_reference text,
  invoice_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  message text not null,
  type text not null default 'info',
  dedupe_key text,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists evaluations_student_id_idx on public.evaluations(student_id);
create index if not exists payments_student_id_idx on public.payments(student_id);
create index if not exists payments_due_date_idx on public.payments(due_date);
create index if not exists payments_status_due_date_idx on public.payments(status, due_date);
create index if not exists notifications_user_id_idx on public.notifications(user_id);
create unique index if not exists payments_student_due_unique_idx on public.payments(student_id, due_date);
create unique index if not exists payments_gateway_id_unique_idx on public.payments(gateway_payment_id) where gateway_payment_id is not null;
create unique index if not exists payments_external_reference_unique_idx on public.payments(external_reference) where external_reference is not null;
create unique index if not exists notifications_dedupe_key_unique_idx on public.notifications(dedupe_key) where dedupe_key is not null;

create or replace function private.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  );
$$;
revoke all on function private.is_admin() from public;
grant usage on schema private to authenticated;
grant execute on function private.is_admin() to authenticated;

alter table public.profiles enable row level security;
alter table public.students enable row level security;
alter table public.evaluations enable row level security;
alter table public.payments enable row level security;
alter table public.notifications enable row level security;

create policy "profiles own or admin select" on public.profiles
for select to authenticated
using ((select auth.uid()) = id or (select private.is_admin()));

-- Students do not have direct write access to account/billing fields.
create policy "admin updates profiles" on public.profiles
for update to authenticated
using ((select private.is_admin()))
with check ((select private.is_admin()));

create policy "admin inserts profiles" on public.profiles
for insert to authenticated
with check ((select private.is_admin()));

create policy "admin deletes profiles" on public.profiles
for delete to authenticated
using ((select private.is_admin()));

create policy "students own or admin select" on public.students
for select to authenticated
using ((select auth.uid()) = id or (select private.is_admin()));

create policy "admin inserts students" on public.students
for insert to authenticated
with check ((select private.is_admin()));

create policy "admin updates students" on public.students
for update to authenticated
using ((select private.is_admin()))
with check ((select private.is_admin()));

create policy "admin deletes students" on public.students
for delete to authenticated
using ((select private.is_admin()));

create policy "evaluations own or admin select" on public.evaluations
for select to authenticated
using ((select auth.uid()) = student_id or (select private.is_admin()));

create policy "admin inserts evaluations" on public.evaluations
for insert to authenticated
with check ((select private.is_admin()));

create policy "admin updates evaluations" on public.evaluations
for update to authenticated
using ((select private.is_admin()))
with check ((select private.is_admin()));

create policy "admin deletes evaluations" on public.evaluations
for delete to authenticated
using ((select private.is_admin()));

create policy "payments own or admin select" on public.payments
for select to authenticated
using ((select auth.uid()) = student_id or (select private.is_admin()));

create policy "admin inserts payments" on public.payments
for insert to authenticated
with check ((select private.is_admin()));

create policy "admin updates payments" on public.payments
for update to authenticated
using ((select private.is_admin()))
with check ((select private.is_admin()));

create policy "admin deletes payments" on public.payments
for delete to authenticated
using ((select private.is_admin()));

create policy "notifications own or admin select" on public.notifications
for select to authenticated
using ((select auth.uid()) = user_id or (select private.is_admin()));

create policy "admin inserts notifications" on public.notifications
for insert to authenticated
with check ((select private.is_admin()));

create policy "own notifications update" on public.notifications
for update to authenticated
using ((select auth.uid()) = user_id or (select private.is_admin()))
with check ((select auth.uid()) = user_id or (select private.is_admin()));

grant usage on schema public to authenticated;
grant select, insert, update, delete on public.profiles to authenticated;
grant select, insert, update, delete on public.students to authenticated;
grant select, insert, update, delete on public.evaluations to authenticated;
grant select, insert, update, delete on public.payments to authenticated;
grant select, insert, update, delete on public.notifications to authenticated;
