ALTER VIEW public.comments_public SET (security_invoker = on);
ALTER VIEW public.discussion_replies_public SET (security_invoker = on);
ALTER VIEW public.discussions_public SET (security_invoker = on);
ALTER VIEW public.project_stats SET (security_invoker = on);