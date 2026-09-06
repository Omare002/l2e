REVOKE SELECT ON public.profiles FROM anon;

CREATE OR REPLACE FUNCTION public.get_public_profile(_username text)
RETURNS TABLE (
  id uuid,
  username text,
  display_name text,
  avatar_url text,
  bio text,
  github_url text,
  portfolio_url text,
  accent_color text,
  is_demo boolean,
  created_at timestamptz,
  updated_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    CASE WHEN auth.uid() IS NOT NULL THEN p.id ELSE NULL::uuid END,
    p.username,
    p.display_name,
    p.avatar_url,
    p.bio,
    p.github_url,
    p.portfolio_url,
    p.accent_color,
    p.is_demo,
    p.created_at,
    p.updated_at
  FROM public.profiles p
  WHERE p.username = _username
  LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.get_public_profile(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_public_profile(text) TO anon, authenticated;