-- 1. Allow the new activity types (this check constraint was rejecting every comment insert)
ALTER TABLE public.activity_events DROP CONSTRAINT IF EXISTS activity_events_type_check;
ALTER TABLE public.activity_events ADD CONSTRAINT activity_events_type_check CHECK (type = ANY (ARRAY[
  'account_created','project_submitted','project_updated','project_upvoted',
  'project_commented','discussion_created','discussion_replied'
]));

-- 2. Track comment edits
ALTER TABLE public.comments ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();
DROP TRIGGER IF EXISTS comments_touch ON public.comments;
CREATE TRIGGER comments_touch BEFORE UPDATE ON public.comments
FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- 3. Forums
CREATE TABLE public.discussions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title text NOT NULL,
  body text NOT NULL,
  category text NOT NULL DEFAULT 'General',
  pinned boolean NOT NULL DEFAULT false,
  last_activity_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.discussions TO authenticated;
GRANT SELECT ON public.discussions TO anon;
GRANT ALL ON public.discussions TO service_role;
ALTER TABLE public.discussions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Discussions are publicly viewable" ON public.discussions FOR SELECT USING (true);
CREATE POLICY "Users can start discussions" ON public.discussions FOR INSERT TO authenticated WITH CHECK (author_id = auth.uid());
CREATE POLICY "Authors can update their discussions" ON public.discussions FOR UPDATE TO authenticated USING (author_id = auth.uid()) WITH CHECK (author_id = auth.uid());
CREATE POLICY "Authors can delete their discussions" ON public.discussions FOR DELETE TO authenticated USING (author_id = auth.uid());

CREATE TABLE public.discussion_replies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  discussion_id uuid NOT NULL REFERENCES public.discussions(id) ON DELETE CASCADE,
  author_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  body text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.discussion_replies TO authenticated;
GRANT SELECT ON public.discussion_replies TO anon;
GRANT ALL ON public.discussion_replies TO service_role;
ALTER TABLE public.discussion_replies ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Replies are publicly viewable" ON public.discussion_replies FOR SELECT USING (true);
CREATE POLICY "Users can reply" ON public.discussion_replies FOR INSERT TO authenticated WITH CHECK (author_id = auth.uid());
CREATE POLICY "Authors can update their replies" ON public.discussion_replies FOR UPDATE TO authenticated USING (author_id = auth.uid()) WITH CHECK (author_id = auth.uid());
CREATE POLICY "Authors can delete their replies" ON public.discussion_replies FOR DELETE TO authenticated USING (author_id = auth.uid());

CREATE INDEX discussions_last_activity_idx ON public.discussions (last_activity_at DESC);
CREATE INDEX discussion_replies_discussion_idx ON public.discussion_replies (discussion_id, created_at);

CREATE TRIGGER discussions_touch BEFORE UPDATE ON public.discussions
FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER discussion_replies_touch BEFORE UPDATE ON public.discussion_replies
FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE OR REPLACE FUNCTION public.log_discussion_activity()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  INSERT INTO public.activity_events (actor_id, type) VALUES (NEW.author_id, 'discussion_created');
  RETURN NEW;
END;
$$;
CREATE TRIGGER discussions_activity AFTER INSERT ON public.discussions
FOR EACH ROW EXECUTE FUNCTION public.log_discussion_activity();

CREATE OR REPLACE FUNCTION public.on_discussion_reply()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  UPDATE public.discussions SET last_activity_at = now() WHERE id = NEW.discussion_id;
  INSERT INTO public.activity_events (actor_id, type) VALUES (NEW.author_id, 'discussion_replied');
  RETURN NEW;
END;
$$;
CREATE TRIGGER discussion_replies_activity AFTER INSERT ON public.discussion_replies
FOR EACH ROW EXECUTE FUNCTION public.on_discussion_reply();

ALTER PUBLICATION supabase_realtime ADD TABLE public.discussions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.discussion_replies;
