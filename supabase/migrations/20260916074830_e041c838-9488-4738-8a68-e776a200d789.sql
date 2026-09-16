-- 1. Hidden (moderated) content must not be readable by other members.
DROP POLICY IF EXISTS "Members can view comments" ON public.comments;
CREATE POLICY "Members can view comments"
ON public.comments FOR SELECT TO authenticated
USING (
  (NOT hidden OR author_id = auth.uid() OR public.is_staff(auth.uid()))
  AND EXISTS (
    SELECT 1 FROM public.projects p
    WHERE p.id = comments.project_id
      AND (
        p.published
        OR p.owner_id = auth.uid()
        OR EXISTS (
          SELECT 1 FROM public.project_collaborators pc
          WHERE pc.project_id = p.id AND pc.user_id = auth.uid() AND pc.status = 'accepted'
        )
      )
  )
);

DROP POLICY IF EXISTS "Visible discussions are readable" ON public.discussions;
CREATE POLICY "Visible discussions are readable"
ON public.discussions FOR SELECT TO authenticated
USING (
  (NOT hidden OR author_id = auth.uid() OR public.is_staff(auth.uid()))
  AND private.can_view_quest_discussion(quest_id)
);

DROP POLICY IF EXISTS "Visible replies are readable" ON public.discussion_replies;
CREATE POLICY "Visible replies are readable"
ON public.discussion_replies FOR SELECT TO authenticated
USING (
  (NOT hidden OR author_id = auth.uid() OR public.is_staff(auth.uid()))
  AND EXISTS (
    SELECT 1 FROM public.discussions d
    WHERE d.id = discussion_replies.discussion_id
      AND private.can_view_quest_discussion(d.quest_id)
  )
);

-- 2. Suspension fields are internal moderation data: no client role may read them.
REVOKE SELECT ON public.profiles FROM anon, authenticated;
GRANT SELECT (
  id, username, display_name, avatar_url, bio, github_url, portfolio_url,
  accent_color, is_demo, created_at, updated_at
) ON public.profiles TO anon, authenticated;
GRANT ALL ON public.profiles TO service_role;