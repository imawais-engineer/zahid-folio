create or replace function public.slugify(txt text) returns text language sql immutable set search_path = public as $$
  select trim(both '-' from regexp_replace(lower(coalesce(txt,'')), '[^a-z0-9]+', '-', 'g'))
$$;

create or replace function public.projects_set_slug() returns trigger language plpgsql set search_path = public as $$
declare base text; candidate text; n int := 1;
begin
  base := public.slugify(coalesce(nullif(trim(new.slug),''), new.title));
  if base = '' then base := 'project'; end if;
  candidate := base;
  while exists (select 1 from public.projects where slug = candidate and id <> new.id) loop
    n := n + 1; candidate := base || '-' || n;
  end loop;
  new.slug := candidate;
  return new;
end $$;

create trigger projects_slug before insert or update of slug, title on public.projects
for each row execute function public.projects_set_slug();