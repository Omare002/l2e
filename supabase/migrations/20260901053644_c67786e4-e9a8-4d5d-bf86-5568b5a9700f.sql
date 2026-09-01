REVOKE EXECUTE ON FUNCTION public.my_unread_counts() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.my_unread_counts() TO service_role;