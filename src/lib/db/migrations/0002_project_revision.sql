-- Add the revision column for projects created before optimistic concurrency
-- was introduced (idempotent backfill).

alter table public.projects add column if not exists revision integer not null default 1;

-- Recreate the touch trigger so it also bumps the revision counter.
drop trigger if exists projects_touch on public.projects;

create or replace function public.touch_updated_at() returns trigger
language plpgsql set search_path = public as $$
begin
  new.updated_at = now();
  new.revision = coalesce(old.revision, 0) + 1;
  return new;
end $$;

create trigger projects_touch before update on public.projects
for each row execute function public.touch_updated_at();
