ALTER TABLE public.notifications DROP CONSTRAINT IF EXISTS notifications_type_check;
ALTER TABLE public.notifications ADD CONSTRAINT notifications_type_check CHECK (type IN (
  'message_received','message_request',
  'collaborator_invited','collaborator_accepted','collaborator_declined',
  'new_follower','project_upvoted'
));

CREATE OR REPLACE FUNCTION public.on_vote_created()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  owner uuid;
BEGIN
  SELECT owner_id INTO owner FROM public.projects WHERE id = NEW.project_id;
  IF owner IS NOT NULL AND owner <> NEW.user_id THEN
    INSERT INTO public.notifications (user_id, actor_id, type, project_id)
    VALUES (owner, NEW.user_id, 'project_upvoted', NEW.project_id);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS votes_notify ON public.votes;
CREATE TRIGGER votes_notify AFTER INSERT ON public.votes
FOR EACH ROW EXECUTE FUNCTION public.on_vote_created();