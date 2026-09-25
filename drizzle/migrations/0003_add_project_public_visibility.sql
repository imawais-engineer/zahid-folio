ALTER TABLE public.projects
ADD COLUMN public_enabled boolean NOT NULL DEFAULT true;

COMMENT ON COLUMN public.projects.public_enabled IS 'Controls whether the project is visible on public portfolio pages and direct public URLs.';

DROP POLICY IF EXISTS "Public can read projects" ON public.projects;

CREATE POLICY "Public can read enabled projects"
ON public.projects
FOR SELECT
TO anon
USING (public_enabled = true);

CREATE POLICY "Authenticated can read enabled projects"
ON public.projects
FOR SELECT
TO authenticated
USING (public_enabled = true);

CREATE POLICY "Admins can read all projects"
ON public.projects
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::public.app_role));