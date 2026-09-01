REVOKE EXECUTE ON FUNCTION private.is_blocked_pair(uuid, uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION private.can_read_conversation(uuid, uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION private.can_send_message(uuid, uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION private.is_project_owner(uuid, uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION private.can_edit_project(uuid, uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.my_unread_counts() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.my_unread_counts() TO service_role;