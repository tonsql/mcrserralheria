-- MCR SERRALHERIA — BACKEND SEGURO PARA GITHUB PAGES
-- Execute este arquivo UMA VEZ no SQL Editor do Supabase.
-- Depois crie o usuário administrador em Authentication > Users.

create extension if not exists pgcrypto;

create table if not exists public.admin_profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text not null unique check (username ~ '^[A-Za-z0-9._-]{3,32}$'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.clients (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 2 and 120),
  phone text not null check (phone ~ '^[0-9]{10,15}$'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.service_orders (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  tracking_code text not null unique check (tracking_code ~ '^MCR-[0-9]{4}$'),
  service_type text not null check (char_length(service_type) between 2 and 80),
  title text not null check (char_length(title) between 2 and 160),
  description text check (description is null or char_length(description) <= 1200),
  forecast_date date,
  completed_stage smallint not null default 0 check (completed_stage between 0 and 6),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists idx_admin_profiles_username_lower on public.admin_profiles (lower(username));
create index if not exists idx_clients_name on public.clients (lower(name));
create index if not exists idx_clients_phone on public.clients (phone);
create index if not exists idx_orders_client on public.service_orders (client_id);
create index if not exists idx_orders_tracking on public.service_orders (tracking_code);
create index if not exists idx_orders_updated on public.service_orders (updated_at desc);

-- Só o e-mail oficial da MCR recebe automaticamente o perfil de administrador.
create or replace function public.handle_mcr_admin_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if lower(coalesce(new.email, '')) = 'mcrserralheriabr@gmail.com' then
    insert into public.admin_profiles (id, username)
    values (new.id, 'admin')
    on conflict (id) do nothing;
  end if;
  return new;
end;
$$;

drop trigger if exists on_mcr_admin_created on auth.users;
create trigger on_mcr_admin_created
after insert on auth.users
for each row execute procedure public.handle_mcr_admin_user();

-- Corrige automaticamente o perfil admin caso o usuário tenha sido criado antes deste script.
insert into public.admin_profiles (id, username)
select u.id, 'admin'
from auth.users u
where lower(coalesce(u.email, '')) = 'mcrserralheriabr@gmail.com'
on conflict (id) do update set updated_at = now();

create or replace function public.is_mcr_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.admin_profiles p where p.id = auth.uid()
  );
$$;

-- Resolve o login pelo nome de usuário sem expor a lista de administradores.
create or replace function public.resolve_admin_email(p_username text)
returns table(email text)
language sql
stable
security definer
set search_path = public, auth
as $$
  select u.email::text
  from public.admin_profiles p
  join auth.users u on u.id = p.id
  where lower(p.username) = lower(trim(p_username))
  limit 1;
$$;

-- Consulta pública por código: retorna SOMENTE o necessário para o cliente acompanhar.
-- Telefone, ID interno e demais dados permanecem protegidos.
create or replace function public.track_order(p_code text)
returns table(
  tracking_code text,
  client_name text,
  service_type text,
  order_title text,
  order_description text,
  forecast_date date,
  completed_stage smallint,
  updated_at timestamptz
)
language sql
stable
security definer
set search_path = public
as $$
  select
    o.tracking_code,
    c.name as client_name,
    o.service_type,
    o.title as order_title,
    o.description as order_description,
    o.forecast_date,
    o.completed_stage,
    o.updated_at
  from public.service_orders o
  join public.clients c on c.id = o.client_id
  where upper(o.tracking_code) = upper(trim(p_code))
  limit 1;
$$;

alter table public.admin_profiles enable row level security;
alter table public.clients enable row level security;
alter table public.service_orders enable row level security;

-- Remove políticas antigas com os mesmos nomes, caso o script seja executado novamente.
drop policy if exists "admin_profiles_select_self" on public.admin_profiles;
drop policy if exists "admin_profiles_update_self" on public.admin_profiles;
drop policy if exists "mcr_admin_clients_all" on public.clients;
drop policy if exists "mcr_admin_orders_all" on public.service_orders;

create policy "admin_profiles_select_self"
on public.admin_profiles for select
to authenticated
using (id = auth.uid());

create policy "admin_profiles_update_self"
on public.admin_profiles for update
to authenticated
using (id = auth.uid())
with check (id = auth.uid());

create policy "mcr_admin_clients_all"
on public.clients for all
to authenticated
using (public.is_mcr_admin())
with check (public.is_mcr_admin());

create policy "mcr_admin_orders_all"
on public.service_orders for all
to authenticated
using (public.is_mcr_admin())
with check (public.is_mcr_admin());

revoke all on public.admin_profiles from anon;
revoke all on public.clients from anon;
revoke all on public.service_orders from anon;

grant select, update on public.admin_profiles to authenticated;
grant select, insert, update, delete on public.clients to authenticated;
grant select, insert, update, delete on public.service_orders to authenticated;

grant execute on function public.resolve_admin_email(text) to anon, authenticated;
grant execute on function public.track_order(text) to anon, authenticated;
grant execute on function public.is_mcr_admin() to authenticated;
