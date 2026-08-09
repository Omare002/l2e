REVOKE ALL ON FUNCTION public.is_project_owner(uuid, uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.can_edit_project(uuid, uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.my_unread_counts() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.on_follow_created() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.on_collaborator_change() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.guard_project_owner() FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.is_project_owner(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_edit_project(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.my_unread_counts() TO authenticated;