GRANT SELECT (id, username, display_name, avatar_url, bio, github_url, portfolio_url, accent_color, is_demo, created_at, updated_at)
  ON public.profiles TO anon, authenticated;

CREATE OR REPLACE FUNCTION private.can_send_message(_conversation_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1 FROM public.conversations c
    WHERE c.id = _conversation_id
      AND _user_id IN (c.user_a, c.user_b)
      AND NOT private.is_blocked_pair(c.user_a, c.user_b)
      AND (
        c.status = 'accepted'
        OR (c.status = 'pending' AND c.requester_id = _user_id)
      )
  );
$function$;