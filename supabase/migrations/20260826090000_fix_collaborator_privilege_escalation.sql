-- ============================================================
-- Security fix: project_collaborators RLS currently allows the row's own
-- user_id (i.e. the invited collaborator) to UPDATE that row, since the
-- "Invitee or owner can update a collaboration" policy only checks
-- `user_id = auth.uid() OR is_project_owner(...)` — it has no column-level
-- restriction. That's intentional for the invitee accepting/declining
-- their own invitation, but it also means the invitee could set
-- can_edit = true on themselves directly via a table update, bypassing the
-- app-layer check that this is meant to be owner-only.
--
-- RLS in Postgres can't express "this column only if you're the owner,
-- that column only if you're the invitee" — a BEFORE UPDATE trigger can.
-- This is additive and changes no existing behavior for legitimate
-- updates (status changes by the invitee, can_edit changes by the owner).
-- ============================================================

CREATE OR REPLACE FUNCTION public.guard_collaborator_edit_grant()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.can_edit IS DISTINCT FROM OLD.can_edit
     AND NOT private.is_project_owner(OLD.project_id, auth.uid()) THEN
    RAISE EXCEPTION 'Only the project owner can change edit access';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS project_collaborators_guard_edit ON public.project_collaborators;
CREATE TRIGGER project_collaborators_guard_edit
BEFORE UPDATE ON public.project_collaborators
FOR EACH ROW EXECUTE FUNCTION public.guard_collaborator_edit_grant();

-- Trigger-only function, never called directly (see the 0029 lockdown
-- migration for the same pattern applied to earlier trigger functions).
REVOKE EXECUTE ON FUNCTION public.guard_collaborator_edit_grant() FROM PUBLIC, anon, authenticated;
