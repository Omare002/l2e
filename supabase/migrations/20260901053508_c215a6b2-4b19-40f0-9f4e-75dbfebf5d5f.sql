-- Make the already-defined push subscription table available to the live database.
-- The GRANT follows the table definition as required for public-schema tables.
CREATE TABLE IF NOT EXISTS public.push_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  endpoint text NOT NULL UNIQUE,
  p256dh text NOT NULL,
  auth text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, DELETE ON public.push_subscriptions TO authenticated;
GRANT ALL ON public.push_subscriptions TO service_role;
ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users manage their own push subscriptions" ON public.push_subscriptions;
CREATE POLICY "Users manage their own push subscriptions"
  ON public.push_subscriptions FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Keep helper functions available to policy evaluation, but remove them from
-- the exposed public API schema so they cannot be called through RPC.
CREATE SCHEMA IF NOT EXISTS private;
GRANT USAGE ON SCHEMA private TO authenticated, service_role;
ALTER FUNCTION public.is_blocked_pair(uuid, uuid) SET SCHEMA private;
ALTER FUNCTION public.can_read_conversation(uuid, uuid) SET SCHEMA private;
ALTER FUNCTION public.can_send_message(uuid, uuid) SET SCHEMA private;
ALTER FUNCTION public.is_project_owner(uuid, uuid) SET SCHEMA private;
ALTER FUNCTION public.can_edit_project(uuid, uuid) SET SCHEMA private;
REVOKE EXECUTE ON FUNCTION private.is_blocked_pair(uuid, uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION private.can_read_conversation(uuid, uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION private.can_send_message(uuid, uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION private.is_project_owner(uuid, uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION private.can_edit_project(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION private.is_blocked_pair(uuid, uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION private.can_read_conversation(uuid, uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION private.can_send_message(uuid, uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION private.is_project_owner(uuid, uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION private.can_edit_project(uuid, uuid) TO authenticated, service_role;

-- Public projections now honor the querying role's permissions and RLS.
ALTER VIEW public.project_stats SET (security_invoker = on);
ALTER VIEW public.leaderboard SET (security_invoker = on);
ALTER VIEW public.community_totals SET (security_invoker = on);
ALTER VIEW public.comments_public SET (security_invoker = on);
ALTER VIEW public.discussions_public SET (security_invoker = on);
ALTER VIEW public.discussion_replies_public SET (security_invoker = on);
ALTER VIEW public.activity_public SET (security_invoker = on);
ALTER VIEW public.follow_counts SET (security_invoker = on);
ALTER VIEW public.project_collaborators_public SET (security_invoker = on);