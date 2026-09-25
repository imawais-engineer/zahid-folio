-- Self-hosted portfolio schema (mirrors the previous Supabase/Lovable schema).

create type public.app_role as enum ('admin', 'user');

create table public.users (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  password_hash text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  role public.app_role not null,
  unique (user_id, role)
);

create table public.sessions (
  id uuid primary key default gen_random_uuid(),
  token_hash text not null unique,
  user_id uuid not null references public.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  last_seen_at timestamptz not null default now(),
  user_agent text,
  ip_address text
);
create index sessions_user_id_idx on public.sessions (user_id);
create index sessions_expires_at_idx on public.sessions (expires_at);

-- Failed-login rate limiting (by email and by source IP).
create table public.login_attempts (
  id bigint generated always as identity primary key,
  email text not null,
  ip_address text,
  success boolean not null default false,
  attempted_at timestamptz not null default now()
);
create index login_attempts_email_idx on public.login_attempts (email, attempted_at);
create index login_attempts_ip_idx on public.login_attempts (ip_address, attempted_at);

create table public.projects (
  id uuid primary key default gen_random_uuid(),
  slug text unique,
  title text not null,
  short text not null default '',
  platforms text[] not null default '{}',
  capabilities text[] not null default '{}',
  industries text[] not null default '{}',
  tags text[] not null default '{}',
  access text not null default 'interactive',
  thumbnail_url text,
  screenshots text[] not null default '{}',
  model_url text,
  challenge text not null default '',
  approach text not null default '',
  value text not null default '',
  priority integer not null default 0,
  featured boolean not null default false,
  is_template boolean not null default false,
  public_enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- monotonic version for optimistic concurrency (JS Date lacks the
  -- microsecond precision of timestamptz, so equality on timestamps is unsafe)
  revision integer not null default 1
);
create index projects_public_priority_idx on public.projects (public_enabled, priority desc);

-- keep updated_at fresh + bump revision on every UPDATE (replaces the Supabase trigger)
create or replace function public.touch_updated_at() returns trigger
language plpgsql set search_path = public as $$
begin
  new.updated_at = now();
  new.revision = coalesce(old.revision, 0) + 1;
  return new;
end $$;

create trigger projects_touch before update on public.projects
for each row execute function public.touch_updated_at();

-- auto-generate/unique-ify slugs (replaces the Supabase slugify trigger)
create or replace function public.slugify(txt text) returns text
language sql immutable set search_path = public as $$
  select trim(both '-' from regexp_replace(lower(coalesce(txt, '')), '[^a-z0-9]+', '-', 'g'))
$$;

create or replace function public.projects_set_slug() returns trigger
language plpgsql set search_path = public as $$
declare
  base text;
  candidate text;
  n int := 1;
begin
  base := public.slugify(coalesce(nullif(trim(new.slug), ''), new.title));
  if base = '' then base := 'project'; end if;
  candidate := base;
  while exists (select 1 from public.projects where slug = candidate and id <> new.id) loop
    n := n + 1;
    candidate := base || '-' || n;
  end loop;
  new.slug := candidate;
  return new;
end $$;

create trigger projects_slug before insert or update of slug, title on public.projects
for each row execute function public.projects_set_slug();
