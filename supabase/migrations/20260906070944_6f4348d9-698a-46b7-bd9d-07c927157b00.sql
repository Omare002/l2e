DROP FUNCTION IF EXISTS public.get_public_profile(text);
REVOKE SELECT ON public.profiles FROM anon;
GRANT SELECT (
  username,
  display_name,
  avatar_url,
  bio,
  github_url,
  portfolio_url,
  accent_color,
  is_demo,
  created_at,
  updated_at
) ON public.profiles TO anon;