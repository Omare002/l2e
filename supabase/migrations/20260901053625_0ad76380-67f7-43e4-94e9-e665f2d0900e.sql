ALTER VIEW public.project_stats SET (security_invoker = on);
ALTER VIEW public.leaderboard SET (security_invoker = on);
ALTER VIEW public.community_totals SET (security_invoker = on);
ALTER VIEW public.comments_public SET (security_invoker = on);
ALTER VIEW public.discussions_public SET (security_invoker = on);
ALTER VIEW public.discussion_replies_public SET (security_invoker = on);
ALTER VIEW public.activity_public SET (security_invoker = on);
ALTER VIEW public.follow_counts SET (security_invoker = on);
ALTER VIEW public.project_collaborators_public SET (security_invoker = on);

-- The internal authorization helpers are already isolated in the private schema
-- and only executable by authenticated policy evaluation and service operations.
REVOKE EXECUTE ON FUNCTION private.is_blocked_pair(uuid, uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION private.can_read_conversation(uuid, uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION private.can_send_message(uuid, uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION private.is_project_owner(uuid, uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION private.can_edit_project(uuid, uuid) FROM PUBLIC, anon;