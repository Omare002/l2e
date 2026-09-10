REVOKE ALL ON FUNCTION public.is_quest_member(uuid, uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.is_quest_creator(uuid, uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.is_open_quest(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_quest_member(uuid, uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.is_quest_creator(uuid, uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.is_open_quest(uuid) TO authenticated, service_role;