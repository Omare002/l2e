-- Prevent self-voting at the database level
DROP POLICY IF EXISTS "Users can vote as themselves" ON public.votes;
CREATE POLICY "Users can vote as themselves"
  ON public.votes FOR INSERT TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND NOT EXISTS (
      SELECT 1 FROM public.projects p
      WHERE p.id = votes.project_id AND p.owner_id = auth.uid()
    )
  );

-- Log comments in the activity feed
CREATE OR REPLACE FUNCTION public.log_comment_activity()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.activity_events (actor_id, project_id, type)
  VALUES (NEW.author_id, NEW.project_id, 'project_commented');
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS comments_activity ON public.comments;
CREATE TRIGGER comments_activity
AFTER INSERT ON public.comments
FOR EACH ROW EXECUTE FUNCTION public.log_comment_activity();