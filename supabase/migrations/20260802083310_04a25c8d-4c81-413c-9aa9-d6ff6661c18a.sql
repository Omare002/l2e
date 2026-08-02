REVOKE ALL ON FUNCTION public.log_comment_activity() FROM anon, authenticated, public;
REVOKE ALL ON FUNCTION public.log_project_activity() FROM anon, authenticated, public;
REVOKE ALL ON FUNCTION public.log_vote_activity() FROM anon, authenticated, public;
REVOKE ALL ON FUNCTION public.on_profile_created() FROM anon, authenticated, public;
REVOKE ALL ON FUNCTION public.touch_updated_at() FROM anon, authenticated, public;