import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import {
  builderSearchSchema,
  followSchema,
  inviteCollaboratorSchema,
  removeCollaborationSchema,
  respondCollaborationSchema,
  updateCollaborationSchema,
} from "@/lib/validation";

/** Follow or unfollow another builder. Idempotent, never self-directed. */
export const setFollow = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => followSchema.parse(input))
  .handler(async ({ data, context }) => {
    if (data.userId === context.userId) throw new Error("You can't follow yourself");

    if (data.action === "follow") {
      const { error } = await context.supabase
        .from("follows")
        .insert({ follower_id: context.userId, following_id: data.userId });
      if (error && !error.message.toLowerCase().includes("duplicate")) {
        console.error("[setFollow]", error.message);
        throw new Error("Could not follow this builder");
      }
      if (!error) {
        const { sendPushToUser, actorName } = await import("@/lib/push.server");
        await sendPushToUser(data.userId, {
          kind: "new_follower",
          actorName: await actorName(context.supabase as never, context.userId),
          url: "/",
        });
      }
      return { following: true };
    }

    const { error } = await context.supabase
      .from("follows")
      .delete()
      .eq("follower_id", context.userId)
      .eq("following_id", data.userId);
    if (error) {
      console.error("[setFollow]", error.message);
      throw new Error("Could not unfollow this builder");
    }
    return { following: false };
  });

/** Finds registered builders to invite, excluding the owner and anyone already on the project. */
export const searchBuilders = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => builderSearchSchema.parse(input))
  .handler(async ({ data, context }) => {
    const owns = await context.supabase
      .from("projects")
      .select("id")
      .eq("id", data.projectId)
      .eq("owner_id", context.userId)
      .maybeSingle();
    if (!owns.data) throw new Error("Only the project owner can invite collaborators");

    const existing = await context.supabase
      .from("project_collaborators")
      .select("user_id")
      .eq("project_id", data.projectId);
    const taken = new Set([context.userId, ...(existing.data ?? []).map((r) => r.user_id)]);

    // PostgREST's .or() filter treats , ( ) . as syntax, not data — an
    // unescaped term could inject extra filter clauses. Escape every
    // PostgREST-reserved character with a backslash per their filter
    // syntax rather than just stripping a subset of them.
    const term = data.term.replace(/[%_,()."\\]/g, (c) => `\\${c}`);
    const { data: found, error } = await context.supabase
      .from("profiles")
      .select("id, username, display_name, avatar_url, accent_color")
      .or(`username.ilike.%${term}%,display_name.ilike.%${term}%`)
      .limit(12);
    if (error) {
      console.error("[searchBuilders]", error.message);
      throw new Error("Could not search builders right now");
    }
    return (found ?? []).filter((p) => !taken.has(p.id)).slice(0, 8);
  });

/** Owner invites a builder. One invitation per person per project. */
export const inviteCollaborator = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => inviteCollaboratorSchema.parse(input))
  .handler(async ({ data, context }) => {
    if (data.userId === context.userId) throw new Error("You're already on this project");

    const owns = await context.supabase
      .from("projects")
      .select("id")
      .eq("id", data.projectId)
      .eq("owner_id", context.userId)
      .maybeSingle();
    if (!owns.data) throw new Error("Only the project owner can invite collaborators");

    const existing = await context.supabase
      .from("project_collaborators")
      .select("id, status")
      .eq("project_id", data.projectId)
      .eq("user_id", data.userId)
      .maybeSingle();

    if (existing.data) {
      if (existing.data.status === "accepted") throw new Error("They're already a collaborator");
      if (existing.data.status === "pending")
        throw new Error("They already have a pending invitation");
      const { error } = await context.supabase
        .from("project_collaborators")
        .update({ status: "pending", can_edit: data.canEdit, invited_by: context.userId })
        .eq("id", existing.data.id);
      if (error) {
        console.error("[inviteCollaborator/reinvite]", error.message);
        throw new Error("Could not send that invitation");
      }
      return { id: existing.data.id, reinvited: true };
    }

    const { data: created, error } = await context.supabase
      .from("project_collaborators")
      .insert({
        project_id: data.projectId,
        user_id: data.userId,
        invited_by: context.userId,
        can_edit: data.canEdit,
        status: "pending",
      })
      .select("id")
      .single();
    if (error) {
      console.error("[inviteCollaborator]", error.message);
      throw new Error("Could not send that invitation");
    }
    {
      const { sendPushToUser, actorName } = await import("@/lib/push.server");
      await sendPushToUser(data.userId, {
        kind: "collaborator_invited",
        actorName: await actorName(context.supabase as never, context.userId),
        url: "/dashboard",
      });
    }
    return { id: created.id, reinvited: false };
  });

/** The invited builder accepts or declines. Only they can answer. */
export const respondToCollaboration = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => respondCollaborationSchema.parse(input))
  .handler(async ({ data, context }) => {
    const row = await context.supabase
      .from("project_collaborators")
      .select("id, user_id, status")
      .eq("id", data.id)
      .maybeSingle();
    if (!row.data || row.data.user_id !== context.userId) {
      throw new Error("That invitation isn't available");
    }
    if (row.data.status !== "pending") throw new Error("You already answered this invitation");

    const { error } = await context.supabase
      .from("project_collaborators")
      .update({ status: data.action === "accept" ? "accepted" : "declined" })
      .eq("id", data.id);
    if (error) {
      console.error("[respondToCollaboration]", error.message);
      throw new Error("Could not update that invitation");
    }
    return { ok: true };
  });

/** Owner grants or revokes edit rights. Only the project owner may do this —
 *  never the collaborator themselves, even for their own row. */
export const setCollaboratorEdit = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => updateCollaborationSchema.parse(input))
  .handler(async ({ data, context }) => {
    const row = await context.supabase
      .from("project_collaborators")
      .select("id, project_id")
      .eq("id", data.id)
      .maybeSingle();
    if (!row.data) throw new Error("That collaborator wasn't found");

    const owns = await context.supabase
      .from("projects")
      .select("id")
      .eq("id", row.data.project_id)
      .eq("owner_id", context.userId)
      .maybeSingle();
    if (!owns.data) throw new Error("Only the project owner can change edit access");

    const { error } = await context.supabase
      .from("project_collaborators")
      .update({ can_edit: data.canEdit })
      .eq("id", data.id);
    if (error) {
      console.error("[setCollaboratorEdit]", error.message);
      throw new Error("Could not update those permissions");
    }
    return { ok: true };
  });

/** Owner removes a collaborator, or a collaborator leaves. Checked here in
 *  addition to RLS so an unauthorized attempt gets a clear error instead of
 *  a silent no-op. */
export const removeCollaborator = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => removeCollaborationSchema.parse(input))
  .handler(async ({ data, context }) => {
    const row = await context.supabase
      .from("project_collaborators")
      .select("id, user_id, project_id")
      .eq("id", data.id)
      .maybeSingle();
    if (!row.data) throw new Error("That collaborator wasn't found");

    if (row.data.user_id !== context.userId) {
      const owns = await context.supabase
        .from("projects")
        .select("id")
        .eq("id", row.data.project_id)
        .eq("owner_id", context.userId)
        .maybeSingle();
      if (!owns.data) throw new Error("Only the project owner can remove a collaborator");
    }

    const { error } = await context.supabase
      .from("project_collaborators")
      .delete()
      .eq("id", data.id);
    if (error) {
      console.error("[removeCollaborator]", error.message);
      throw new Error("Could not remove that collaborator");
    }
    return { ok: true };
  });
