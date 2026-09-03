ALTER VIEW public.leaderboard SET (security_invoker = off);
ALTER VIEW public.project_stats SET (security_invoker = off);
ALTER VIEW public.activity_public SET (security_invoker = off);
ALTER VIEW public.comments_public SET (security_invoker = off);
ALTER VIEW public.discussions_public SET (security_invoker = off);
ALTER VIEW public.discussion_replies_public SET (security_invoker = off);
ALTER VIEW public.follow_counts SET (security_invoker = off);
ALTER VIEW public.project_collaborators_public SET (security_invoker = off);