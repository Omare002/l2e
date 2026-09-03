DROP TRIGGER IF EXISTS notifications_push ON public.notifications;
DROP FUNCTION IF EXISTS public.on_notification_created();

DROP POLICY IF EXISTS "Members can view comments" ON public.comments;
CREATE POLICY "Members can view comments"
  ON public.comments FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.projects p
      WHERE p.id = comments.project_id
        AND (
          p.published
          OR p.owner_id = auth.uid()
          OR EXISTS (
            SELECT 1
            FROM public.project_collaborators pc
            WHERE pc.project_id = p.id
              AND pc.user_id = auth.uid()
              AND pc.status = 'accepted'
          )
        )
    )
  );

DROP POLICY IF EXISTS "Members see relevant collaborations" ON public.project_collaborators;
CREATE POLICY "Members see relevant collaborations"
  ON public.project_collaborators FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    OR invited_by = auth.uid()
    OR private.is_project_owner(project_id, auth.uid())
    OR (
      status = 'accepted'
      AND EXISTS (
        SELECT 1
        FROM public.projects p
        WHERE p.id = project_collaborators.project_id
          AND p.published
      )
    )
  );

DROP POLICY IF EXISTS "Members can view votes" ON public.votes;
CREATE POLICY "Members can view votes"
  ON public.votes FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.projects p
      WHERE p.id = votes.project_id
        AND (
          p.published
          OR p.owner_id = auth.uid()
          OR EXISTS (
            SELECT 1
            FROM public.project_collaborators pc
            WHERE pc.project_id = p.id
              AND pc.user_id = auth.uid()
              AND pc.status = 'accepted'
          )
        )
    )
  );

DROP POLICY IF EXISTS "Members can view activity" ON public.activity_events;
CREATE POLICY "Members can view activity"
  ON public.activity_events FOR SELECT TO authenticated
  USING (
    project_id IS NULL
    OR EXISTS (
      SELECT 1
      FROM public.projects p
      WHERE p.id = activity_events.project_id
        AND (
          p.published
          OR p.owner_id = auth.uid()
          OR EXISTS (
            SELECT 1
            FROM public.project_collaborators pc
            WHERE pc.project_id = p.id
              AND pc.user_id = auth.uid()
              AND pc.status = 'accepted'
          )
        )
    )
  );

ALTER VIEW public.project_stats SET (security_invoker = on);
ALTER VIEW public.leaderboard SET (security_invoker = on);
ALTER VIEW public.community_totals SET (security_invoker = on);
ALTER VIEW public.comments_public SET (security_invoker = on);
ALTER VIEW public.discussions_public SET (security_invoker = on);
ALTER VIEW public.discussion_replies_public SET (security_invoker = on);
ALTER VIEW public.activity_public SET (security_invoker = on);
ALTER VIEW public.follow_counts SET (security_invoker = on);
ALTER VIEW public.project_collaborators_public SET (security_invoker = on);