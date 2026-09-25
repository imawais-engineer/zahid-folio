ALTER TABLE public.projects ADD COLUMN is_template boolean NOT NULL DEFAULT false;
UPDATE public.projects SET is_template = true;
COMMENT ON COLUMN public.projects.is_template IS 'Marks starter portfolio records that are editable sample templates.';