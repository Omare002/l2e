-- ============================================================
-- Fixes Supabase linter 0029 (authenticated_security_definer_function_executable):
-- several SECURITY DEFINER functions were directly callable by any
-- signed-in user through the API (e.g. POST /rest/v1/rpc/<fn>), when they
-- were only ever meant to be used internally — either fired as triggers,
-- or invoked from inside an RLS policy. This never affected app behavior
-- (nothing in the app calls them directly), but a signed-in user could
-- call them directly and probe things they shouldn't be able to, e.g.
-- "is user A blocked by user B" or "does user X own project Y" for
-- arbitrary IDs.
--
-- Two remediations, matched to how each function is actually used:
--
-- 1. Trigger-only functions never need to be called directly — trigger
--    firing doesn't require the invoking role to have EXECUTE on the
--    trigger function, so revoking it from PUBLIC/anon/authenticated
--    has zero effect on any existing trigger.
--
-- 2. RLS-helper functions (used only inside USING/WITH CHECK clauses)
--    still need `authenticated` to have EXECUTE — Postgres checks that
--    at policy-evaluation time — but they don't need to be reachable via
--    the API. Moving them into a `private` schema (not exposed to
--    PostgREST) closes that off. Existing policies keep working
--    unchanged: Postgres resolves function calls in policies by OID at
--    creation time, not by re-resolving the schema-qualified name on
--    every check, so ALTER ... SET SCHEMA doesn't require touching any
--    policy.
--
-- public.my_unread_counts() is deliberately left alone: the app calls it
-- directly via supabase.rpc(), and it only ever returns the caller's own
-- data (scoped internally to auth.uid()), so direct callability is
-- intended and safe.
-- ============================================================

-- ---------- 1. Trigger-only functions: never callable directly ----------
REVOKE EXECUTE ON FUNCTION public.log_project_activity() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.log_vote_activity() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.on_profile_created() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.log_comment_activity() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.log_discussion_activity() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.on_discussion_reply() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.on_message_sent() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.on_follow_created() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.on_collaborator_change() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.on_notification_created() FROM PUBLIC, anon, authenticated;

-- ---------- 2. RLS-helper functions: move out of the exposed API schema ----------
CREATE SCHEMA IF NOT EXISTS private;
GRANT USAGE ON SCHEMA private TO authenticated, service_role;
-- Not granting USAGE to anon: none of these helpers are used by anon-facing policies.

ALTER FUNCTION public.is_blocked_pair(uuid, uuid) SET SCHEMA private;
ALTER FUNCTION public.can_read_conversation(uuid, uuid) SET SCHEMA private;
ALTER FUNCTION public.can_send_message(uuid, uuid) SET SCHEMA private;
ALTER FUNCTION public.is_project_owner(uuid, uuid) SET SCHEMA private;
ALTER FUNCTION public.can_edit_project(uuid, uuid) SET SCHEMA private;

-- Re-affirm exactly who may invoke them post-move: authenticated (required
-- for RLS evaluation) and service_role. Explicitly revoke PUBLIC/anon too,
-- in case the schema is ever added to the exposed API list by mistake.
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
