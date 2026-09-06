CREATE TABLE public.project_views (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  viewer_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE INDEX project_views_project_created_idx ON public.project_views (project_id, created_at DESC);

GRANT INSERT, SELECT ON public.project_views TO authenticated;
GRANT INSERT ON public.project_views TO anon;
GRANT ALL ON public.project_views TO service_role;

ALTER TABLE public.project_views ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can record a view"
ON public.project_views FOR INSERT TO anon, authenticated
WITH CHECK (viewer_id IS NULL OR viewer_id = auth.uid());

CREATE POLICY "Owners can read views of their projects"
ON public.project_views FOR SELECT TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.projects p
  WHERE p.id = project_views.project_id AND p.owner_id = auth.uid()
));