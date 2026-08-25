-- ============================================================
-- 1. Pre-existing bug fix: notifications_type_check never included
--    'new_follower' or 'collaborator_declined', both of which are
--    inserted by triggers added in migration 20260809084816. Any
--    insert of those types has been failing the CHECK constraint.
--    This widens it — purely additive, nothing existing is removed.
-- ============================================================
ALTER TABLE public.notifications DROP CONSTRAINT notifications_type_check;
ALTER TABLE public.notifications ADD CONSTRAINT notifications_type_check CHECK (type IN (
  'message_received','message_request',
  'collaborator_invited','collaborator_accepted','collaborator_declined',
  'new_follower'
));

-- ============================================================
-- 2. Push subscriptions: one row per browser/device a user enabled
--    notifications on.
-- ============================================================
CREATE TABLE IF NOT EXISTS public.push_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  endpoint text NOT NULL UNIQUE,
  p256dh text NOT NULL,
  auth text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS push_subscriptions_user_idx ON public.push_subscriptions (user_id);

GRANT SELECT, INSERT, DELETE ON public.push_subscriptions TO authenticated;
GRANT ALL ON public.push_subscriptions TO service_role;

ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage their own push subscriptions"
  ON public.push_subscriptions FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- ============================================================
-- 3. Fire-and-forget push delivery on every new notification.
--
--    This is deliberately fail-safe: pg_net may not be enabled, the
--    edge function may not be deployed yet, or the network call may
--    fail — none of that should ever block a notification insert,
--    since notifications inserts are relied on throughout the app
--    (follows, messages, invites). Every possible failure is caught
--    and swallowed.
-- ============================================================
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- A shared secret so the edge function can trust requests that
-- actually came from this trigger. Set independently as an edge
-- function secret (PUSH_TRIGGER_SECRET) — see README for the value.
ALTER DATABASE postgres SET app.settings.push_trigger_secret = '5e71112d-c98f-46ab-8799-d56ff51bed6a';

CREATE OR REPLACE FUNCTION public.on_notification_created()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  BEGIN
    PERFORM extensions.http_post(
      url := 'https://ygzzceodtfuwcdnajueg.supabase.co/functions/v1/send-push',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'x-push-secret', current_setting('app.settings.push_trigger_secret', true)
      ),
      body := jsonb_build_object('notification_id', NEW.id)
    );
  EXCEPTION WHEN OTHERS THEN
    -- Push delivery is best-effort. Never let a delivery problem
    -- (missing extension, undeployed function, network error) block
    -- the notification itself from being created.
    NULL;
  END;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS notifications_push ON public.notifications;
CREATE TRIGGER notifications_push
AFTER INSERT ON public.notifications
FOR EACH ROW EXECUTE FUNCTION public.on_notification_created();
