GRANT USAGE ON SCHEMA private TO authenticated;
GRANT EXECUTE ON FUNCTION private.is_blocked_pair(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION private.can_read_conversation(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION private.can_send_message(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION private.is_project_owner(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION private.can_edit_project(uuid, uuid) TO authenticated;