-- Guests read the forum through the masking views (served server-side); they
-- never need direct access to the base tables, which carry raw author_id.
DROP POLICY IF EXISTS "Visible discussions are readable" ON public.discussions;
CREATE POLICY "Visible discussions are readable"
ON public.discussions
FOR SELECT
TO authenticated
USING (private.can_view_quest_discussion(quest_id));

DROP POLICY IF EXISTS "Visible replies are readable" ON public.discussion_replies;
CREATE POLICY "Visible replies are readable"
ON public.discussion_replies
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.discussions d
    WHERE d.id = discussion_replies.discussion_id
      AND private.can_view_quest_discussion(d.quest_id)
  )
);

REVOKE SELECT ON public.discussions FROM anon;
REVOKE SELECT ON public.discussion_replies FROM anon;