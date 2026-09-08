import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/**
 * Quests: shared weekly tasks, head-to-head challenges and small group races.
 *
 * Winners are decided by the *existing* upvote system — `quest_standings`
 * counts votes cast on each participant's submitted project inside the quest
 * window, so lifetime project likes are never reset or duplicated.
 */
async function admin() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}

async function closeFinished(db: { rpc: (n: "close_finished_quests") => PromiseLike<unknown> }) {
  try {
    await db.rpc("close_finished_quests");
  } catch (e) {
    console.error("[quests] close_finished_quests", e);
  }
}

const idSchema = z.object({ questId: z.string().uuid() });

export const QUEST_KINDS = ["shared_task", "challenge", "group"] as const;

const createSchema = z.object({
  title: z.string().trim().min(3, "Give the quest a name").max(90),
  description: z.string().trim().max(600).default(""),
  kind: z.enum(QUEST_KINDS).default("group"),
  taskId: z.string().uuid().nullable().optional(),
  endsAt: z.string().datetime(),
  visibility: z.enum(["public", "private"]).default("public"),
  invite: z.array(z.string().uuid()).max(20).default([]),
});

/** Current and upcoming weekly build tasks — public. */
export const getWeeklyTasks = createServerFn({ method: "GET" }).handler(async () => {
  const db = await admin();
  const res = await db
    .from("weekly_tasks")
    .select("*")
    .order("starts_at", { ascending: true })
    .limit(12);
  if (res.error) {
    console.error("[getWeeklyTasks]", res.error.message);
    return [];
  }
  return res.data ?? [];
});

/**
 * Every quest, newest first. Finished quests get their winner recorded first.
 *
 * Public projection: guests receive display names, deadlines, participant
 * counts and winners, but never raw account identifiers.
 */
export const getPublicQuests = createServerFn({ method: "GET" }).handler(async () => {
  const db = await admin();
  await closeFinished(db);
  const res = await db
    .from("quests")
    .select(
      "id, title, description, kind, visibility, starts_at, ends_at, closed_at, winner_votes, creator:profiles!quests_creator_id_fkey(username, display_name, avatar_url, accent_color), winner:profiles!quests_winner_id_fkey(username, display_name), task:weekly_tasks(title), participants:quest_participants(status)",
    )
    .order("created_at", { ascending: false })
    .limit(60);
  if (res.error) {
    console.error("[getPublicQuests]", res.error.message);
    return [];
  }
  return (res.data ?? []).map((q) => ({
    ...q,
    participants: (q.participants ?? []).map((p: { status: string }) => ({ status: p.status })),
  }));
});

/** One quest plus live standings, readable by guests — identity-free. */
export const getPublicQuest = createServerFn({ method: "GET" })
  .inputValidator((input: unknown) => idSchema.parse(input))
  .handler(async ({ data }) => {
    const db = await admin();
    await closeFinished(db);

    const quest = await db
      .from("quests")
      .select(
        "id, title, description, kind, visibility, starts_at, ends_at, closed_at, winner_votes, creator:profiles!quests_creator_id_fkey(username, display_name, avatar_url, accent_color), winner:profiles!quests_winner_id_fkey(username, display_name), task:weekly_tasks(title, prompt)",
      )
      .eq("id", data.questId)
      .maybeSingle();
    if (quest.error) console.error("[getPublicQuest]", quest.error.message);
    if (!quest.data) return null;

    const standings = await db.rpc("quest_standings", { _quest_id: data.questId });
    if (standings.error) console.error("[getPublicQuest/standings]", standings.error.message);

    // Drop user_id / project_id UUIDs: the UI keys off the public username and slug.
    const safe = (standings.data ?? []).map(
      (s: {
        username: string;
        display_name: string;
        avatar_url: string | null;
        accent_color: string;
        status: string;
        joined_at: string;
        project_title: string | null;
        project_slug: string | null;
        project_published: boolean | null;
        project_status: string | null;
        votes: number;
      }) => ({
        username: s.username,
        display_name: s.display_name,
        avatar_url: s.avatar_url,
        accent_color: s.accent_color,
        status: s.status,
        joined_at: s.joined_at,
        project_title: s.project_title,
        project_slug: s.project_slug,
        project_published: s.project_published,
        project_status: s.project_status,
        votes: s.votes,
      }),
    );


    return { quest: quest.data, standings: safe };
  });

/** The signed-in member's own row in a quest (status + entry). */
export const getMyQuestEntry = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => idSchema.parse(input))
  .handler(async ({ data, context }) => {
    const res = await context.supabase
      .from("quest_participants")
      .select("status, project_id, submitted_at")
      .eq("quest_id", data.questId)
      .eq("user_id", context.userId)
      .maybeSingle();
    if (res.error) {
      console.error("[getMyQuestEntry]", res.error.message);
      return null;
    }
    return res.data ?? null;
  });

/** Quests the member took part in, with deadline, size and winner — for history. */
export const getMyQuestHistory = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const rows = await context.supabase
      .from("quest_participants")
      .select("quest_id, status, project_id, submitted_at")
      .eq("user_id", context.userId);
    if (rows.error) {
      console.error("[getMyQuestHistory]", rows.error.message);
      return [];
    }
    const ids = (rows.data ?? []).map((r) => r.quest_id);
    if (ids.length === 0) return [];

    const quests = await context.supabase
      .from("quests")
      .select(
        "id, title, kind, visibility, starts_at, ends_at, closed_at, winner_votes, winner:profiles!quests_winner_id_fkey(username, display_name), task:weekly_tasks(title), participants:quest_participants(status)",
      )
      .in("id", ids)
      .order("ends_at", { ascending: false });
    if (quests.error) {
      console.error("[getMyQuestHistory/quests]", quests.error.message);
      return [];
    }
    const mine = new Map((rows.data ?? []).map((r) => [r.quest_id, r]));
    return (quests.data ?? []).map((q) => ({
      ...q,
      my_status: mine.get(q.id)?.status ?? "invited",
      submitted: Boolean(mine.get(q.id)?.project_id),
      submitted_at: mine.get(q.id)?.submitted_at ?? null,
    }));
  });

/** Quests the signed-in member created, joined, or was invited to. */
export const getMyQuests = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const res = await context.supabase
      .from("quest_participants")
      .select(
        "id, status, project_id, submitted_at, quest:quests(id, title, description, kind, visibility, starts_at, ends_at, closed_at, winner_id, creator_id, task:weekly_tasks(title, prompt))",
      )
      .eq("user_id", context.userId)
      .order("created_at", { ascending: false });
    if (res.error) {
      console.error("[getMyQuests]", res.error.message);
      return [];
    }
    const rows = res.data ?? [];

    // Entered project titles, so "My quests" can show what was submitted.
    const projectIds = rows.map((r) => r.project_id).filter((v): v is string => Boolean(v));
    let projects: Record<string, { title: string; slug: string; published: boolean }> = {};
    if (projectIds.length > 0) {
      const pr = await context.supabase
        .from("projects")
        .select("id, title, slug, published")
        .in("id", projectIds);
      if (!pr.error) {
        projects = Object.fromEntries(
          (pr.data ?? []).map((p) => [
            p.id,
            { title: p.title, slug: p.slug, published: p.published },
          ]),
        );
      }
    }

    return rows.map((r) => ({
      ...r,
      project: r.project_id ? (projects[r.project_id] ?? null) : null,
    }));
  });

/**
 * Every participant's submission for a quest — creator only.
 * Names and project titles only; no raw account identifiers leave the server.
 */
export const getQuestSubmissions = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => idSchema.parse(input))
  .handler(async ({ data, context }) => {
    const quest = await context.supabase
      .from("quests")
      .select("id, creator_id")
      .eq("id", data.questId)
      .maybeSingle();
    if (!quest.data || quest.data.creator_id !== context.userId) return [];

    const res = await context.supabase
      .from("quest_participants")
      .select(
        "status, submitted_at, created_at, project_id, member:profiles!quest_participants_user_id_fkey(username, display_name, avatar_url, accent_color)",
      )
      .eq("quest_id", data.questId);
    if (res.error) {
      console.error("[getQuestSubmissions]", res.error.message);
      return [];
    }
    const rows = res.data ?? [];
    const ids = rows.map((r) => r.project_id).filter((v): v is string => Boolean(v));
    let projects: Record<string, { title: string; slug: string; published: boolean }> = {};
    if (ids.length > 0) {
      const pr = await (await admin())
        .from("projects")
        .select("id, title, slug, published")
        .in("id", ids);
      if (!pr.error) {
        projects = Object.fromEntries(
          (pr.data ?? []).map((p) => [
            p.id,
            { title: p.title, slug: p.slug, published: p.published },
          ]),
        );
      }
    }
    return rows.map((r) => ({
      status: r.status,
      submitted_at: r.submitted_at,
      joined_at: r.created_at,
      member: r.member,
      project: r.project_id ? (projects[r.project_id] ?? null) : null,
    }));
  });

/** Create a quest; the creator joins automatically and invitees are notified. */
export const createQuest = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => createSchema.parse(input))
  .handler(async ({ data, context }) => {
    const ends = new Date(data.endsAt);
    if (Number.isNaN(ends.getTime()) || ends.getTime() <= Date.now()) {
      throw new Error("Pick a deadline in the future");
    }

    const created = await context.supabase
      .from("quests")
      .insert({
        creator_id: context.userId,
        title: data.title,
        description: data.description,
        kind: data.kind,
        visibility: data.visibility,
        task_id: data.taskId ?? null,
        ends_at: ends.toISOString(),
      })
      .select("id, title")
      .single();
    if (created.error || !created.data) {
      console.error("[createQuest]", created.error?.message);
      throw new Error("Could not create this quest");
    }

    await context.supabase
      .from("quest_participants")
      .insert({ quest_id: created.data.id, user_id: context.userId, status: "accepted" });

    const invitees = data.invite.filter((id) => id !== context.userId);
    if (invitees.length > 0) {
      await inviteMany(context, created.data.id, created.data.title, invitees);
    }

    return { id: created.data.id };
  });

/** Invite more builders to an existing quest (creator only). */
export const inviteToQuest = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    idSchema.extend({ userIds: z.array(z.string().uuid()).min(1).max(20) }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const quest = await context.supabase
      .from("quests")
      .select("id, title, creator_id")
      .eq("id", data.questId)
      .maybeSingle();
    if (!quest.data || quest.data.creator_id !== context.userId) {
      throw new Error("Only the quest creator can invite builders");
    }
    await inviteMany(
      context,
      data.questId,
      quest.data.title,
      data.userIds.filter((id) => id !== context.userId),
    );
    return { ok: true };
  });

/** Accept or decline an invitation, or join an open quest. */
export const respondToQuest = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    idSchema.extend({ action: z.enum(["accept", "decline", "join"]) }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const status = data.action === "decline" ? "declined" : "accepted";

    const quest = await context.supabase
      .from("quests")
      .select("id, kind, visibility, closed_at, creator_id")
      .eq("id", data.questId)
      .maybeSingle();
    if (!quest.data) throw new Error("That quest no longer exists");

    const existing = await context.supabase
      .from("quest_participants")
      .select("id")
      .eq("quest_id", data.questId)
      .eq("user_id", context.userId)
      .maybeSingle();

    if (existing.data) {
      const { error } = await context.supabase
        .from("quest_participants")
        .update({ status })
        .eq("id", existing.data.id);
      if (error) {
        console.error("[respondToQuest]", error.message);
        throw new Error("Could not update your answer");
      }
    } else {
      // No invitation on file: only open quests can be entered directly.
      const open =
        !quest.data.closed_at &&
        quest.data.visibility === "public" &&
        (quest.data.kind === "group" || quest.data.kind === "shared_task");
      if (!open && quest.data.creator_id !== context.userId) {
        throw new Error("This quest is invite only — ask the creator for an invitation");
      }
      const { error } = await context.supabase
        .from("quest_participants")
        .insert({ quest_id: data.questId, user_id: context.userId, status });
      if (error) {
        console.error("[respondToQuest/join]", error.message);
        throw new Error("Could not join this quest");
      }
    }
    return { status };
  });

/** Enter one of your own projects into a quest you've accepted. */
export const submitQuestProject = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    idSchema.extend({ projectId: z.string().uuid().nullable() }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const quest = await context.supabase
      .from("quests")
      .select("id, ends_at, closed_at")
      .eq("id", data.questId)
      .maybeSingle();
    if (!quest.data) throw new Error("That quest no longer exists");
    if (quest.data.closed_at || new Date(quest.data.ends_at) <= new Date()) {
      throw new Error("Submissions are locked — this quest deadline has passed");
    }

    const membership = await context.supabase
      .from("quest_participants")
      .select("id, status")
      .eq("quest_id", data.questId)
      .eq("user_id", context.userId)
      .maybeSingle();
    if (!membership.data) throw new Error("Enter the quest before submitting a project");

    if (data.projectId) {
      const owns = await context.supabase
        .from("projects")
        .select("id")
        .eq("id", data.projectId)
        .eq("owner_id", context.userId)
        .maybeSingle();
      if (!owns.data) throw new Error("You can only enter your own project");

      // One project counts once per quest: two people can never race the same entry.
      const taken = await context.supabase
        .from("quest_participants")
        .select("user_id")
        .eq("quest_id", data.questId)
        .eq("project_id", data.projectId)
        .neq("user_id", context.userId)
        .maybeSingle();
      if (taken.data) {
        throw new Error("That project is already entered in this quest by another builder");
      }
    }

    const { error } = await context.supabase
      .from("quest_participants")
      .update({
        project_id: data.projectId,
        status: "accepted",
        submitted_at: data.projectId ? new Date().toISOString() : null,
      })
      .eq("quest_id", data.questId)
      .eq("user_id", context.userId);
    if (error) {
      console.error("[submitQuestProject]", error.message);
      throw new Error(
        error.message.includes("locked")
          ? "Submissions are locked — this quest deadline has passed"
          : "Could not enter your project",
      );
    }
    return { ok: true, submittedAt: data.projectId ? new Date().toISOString() : null };
  });

type Ctx = { supabase: unknown; userId: string };

/** Inserts invitations; the database trigger writes the in-app notification. */
async function inviteMany(context: Ctx, questId: string, title: string, userIds: string[]) {
  const supabase = context.supabase as {
    from: (t: string) => {
      insert: (rows: unknown[]) => Promise<{ error: { message: string } | null }>;
    };
  };
  const { error } = await supabase.from("quest_participants").insert(
    userIds.map((id) => ({
      quest_id: questId,
      user_id: id,
      invited_by: context.userId,
      status: "invited",
    })),
  );
  if (error && !error.message.toLowerCase().includes("duplicate")) {
    console.error("[inviteToQuest]", error.message);
    throw new Error("Could not send every invitation");
  }

  const { sendPushToUser, actorName } = await import("@/lib/push.server");
  const actor = await actorName(context.supabase as never, context.userId);
  await Promise.all(
    userIds.map((id) =>
      sendPushToUser(id, { kind: "quest_invited", actorName: actor, url: `/quests/${questId}` }),
    ),
  );
  void title;
}

/** Builders you can invite: people you follow or who follow you, plus search. */
export const getInvitableBuilders = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ term: z.string().trim().max(60).default("") }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const term = data.term.replace(/[%_,()."\\]/g, (c) => `\\${c}`);

    if (term.length >= 2) {
      const found = await context.supabase
        .from("profiles")
        .select("id, username, display_name, avatar_url, accent_color")
        .or(`username.ilike.%${term}%,display_name.ilike.%${term}%`)
        .neq("id", context.userId)
        .limit(12);
      if (found.error) {
        console.error("[getInvitableBuilders]", found.error.message);
        return [];
      }
      return found.data ?? [];
    }

    const rels = await context.supabase
      .from("follows")
      .select("follower_id, following_id")
      .or(`follower_id.eq.${context.userId},following_id.eq.${context.userId}`)
      .limit(200);
    const ids = new Set<string>();
    for (const r of rels.data ?? []) {
      if (r.follower_id !== context.userId) ids.add(r.follower_id);
      if (r.following_id !== context.userId) ids.add(r.following_id);
    }
    if (ids.size === 0) return [];

    const people = await context.supabase
      .from("profiles")
      .select("id, username, display_name, avatar_url, accent_color")
      .in("id", [...ids])
      .limit(24);
    return people.data ?? [];
  });

/* ---------------------------------------------------------------------------
 * Quest chat — a small room per quest so members can talk about the task,
 * share links and plan submissions before the deadline. Members only: RLS
 * limits reads and posts to the creator and the people invited or joined.
 * ------------------------------------------------------------------------- */

const CHAT_SELECT =
  "id, body, created_at, author_id, author:profiles!quest_messages_author_id_fkey(username, display_name, avatar_url, accent_color)";

/** Messages in a quest room, oldest first. */
export const getQuestMessages = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => idSchema.parse(input))
  .handler(async ({ data, context }) => {
    const res = await context.supabase
      .from("quest_messages")
      .select(CHAT_SELECT)
      .eq("quest_id", data.questId)
      .order("created_at", { ascending: true })
      .limit(200);
    if (res.error) {
      console.error("[getQuestMessages]", res.error.message);
      return [];
    }
    return (res.data ?? []).map((m) => ({ ...m, mine: m.author_id === context.userId }));
  });

/** Post a message into a quest room. */
export const postQuestMessage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    idSchema.extend({ body: z.string().trim().min(1, "Write something").max(2000) }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("quest_messages")
      .insert({ quest_id: data.questId, author_id: context.userId, body: data.body });
    if (error) {
      console.error("[postQuestMessage]", error.message);
      throw new Error("Only builders in this quest can post here");
    }
    return { ok: true };
  });

/** Remove one of your own messages. */
export const deleteQuestMessage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ messageId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("quest_messages")
      .delete()
      .eq("id", data.messageId)
      .eq("author_id", context.userId);
    if (error) {
      console.error("[deleteQuestMessage]", error.message);
      throw new Error("Could not delete this message");
    }
    return { ok: true };
  });

/** Creator-only: switch a quest between Open (anyone can enter) and Private. */
export const setQuestVisibility = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    idSchema.extend({ visibility: z.enum(["public", "private"]) }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { data: updated, error } = await context.supabase
      .from("quests")
      .update({ visibility: data.visibility, updated_at: new Date().toISOString() })
      .eq("id", data.questId)
      .eq("creator_id", context.userId)
      .select("id, visibility")
      .maybeSingle();
    if (error) {
      console.error("[setQuestVisibility]", error.message);
      throw new Error("Could not update who can enter this quest");
    }
    if (!updated) throw new Error("Only the quest creator can change this");
    return updated;
  });

/** Is the signed-in member the creator of this quest? */
export const amIQuestCreator = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => idSchema.parse(input))
  .handler(async ({ data, context }) => {
    const res = await context.supabase
      .from("quests")
      .select("id")
      .eq("id", data.questId)
      .eq("creator_id", context.userId)
      .maybeSingle();
    return { isCreator: Boolean(res.data) };
  });

/* ---------------------------------------------------------------------------
 * Lifecycle: creators edit or delete their own quest, participants can leave.
 * Ownership is checked in the query itself, so RLS is the final word.
 * ------------------------------------------------------------------------- */

const editSchema = idSchema.extend({
  title: z.string().trim().min(3, "Give the quest a name").max(90),
  description: z.string().trim().max(600).default(""),
  kind: z.enum(QUEST_KINDS),
  taskId: z.string().uuid().nullable().optional(),
  endsAt: z.string().datetime(),
  visibility: z.enum(["public", "private"]),
});

/** Creator-only: change a quest's details while it is still running. */
export const updateQuest = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => editSchema.parse(input))
  .handler(async ({ data, context }) => {
    const quest = await context.supabase
      .from("quests")
      .select("id, creator_id, closed_at")
      .eq("id", data.questId)
      .maybeSingle();
    if (!quest.data || quest.data.creator_id !== context.userId) {
      throw new Error("Only the quest creator can edit this quest");
    }
    if (quest.data.closed_at) throw new Error("This quest is finished and can no longer be edited");

    const ends = new Date(data.endsAt);
    if (Number.isNaN(ends.getTime()) || ends.getTime() <= Date.now()) {
      throw new Error("Pick a deadline in the future");
    }

    const { error } = await context.supabase
      .from("quests")
      .update({
        title: data.title,
        description: data.description,
        kind: data.kind,
        task_id: data.taskId ?? null,
        visibility: data.visibility,
        ends_at: ends.toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", data.questId)
      .eq("creator_id", context.userId);
    if (error) {
      console.error("[updateQuest]", error.message);
      throw new Error("Could not save your changes");
    }
    return { ok: true };
  });

/**
 * Creator-only: delete a quest. Only the quest, its participation rows and its
 * chat go away — projects, accounts, votes and community posts are untouched.
 */
export const deleteQuest = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => idSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { data: removed, error } = await context.supabase
      .from("quests")
      .delete()
      .eq("id", data.questId)
      .eq("creator_id", context.userId)
      .select("id")
      .maybeSingle();
    if (error) {
      console.error("[deleteQuest]", error.message);
      throw new Error("Could not delete this quest");
    }
    if (!removed) throw new Error("Only the quest creator can delete this quest");
    return { ok: true };
  });

/** How many builders are in a quest, and how many already submitted (creator only). */
export const getQuestRoster = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => idSchema.parse(input))
  .handler(async ({ data, context }) => {
    const quest = await context.supabase
      .from("quests")
      .select("id, creator_id")
      .eq("id", data.questId)
      .maybeSingle();
    if (!quest.data || quest.data.creator_id !== context.userId) {
      return { participants: 0, submissions: 0 };
    }
    const res = await context.supabase
      .from("quest_participants")
      .select("user_id, status, project_id")
      .eq("quest_id", data.questId);
    const rows = (res.data ?? []).filter((r) => r.user_id !== context.userId);
    return {
      participants: rows.filter((r) => r.status !== "declined").length,
      submissions: rows.filter((r) => Boolean(r.project_id)).length,
    };
  });

/**
 * Participant-only: leave a quest you entered. The creator cannot leave their
 * own quest (they delete it instead); nothing else about the quest changes.
 */
export const leaveQuest = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => idSchema.parse(input))
  .handler(async ({ data, context }) => {
    const quest = await context.supabase
      .from("quests")
      .select("id, creator_id")
      .eq("id", data.questId)
      .maybeSingle();
    if (quest.data?.creator_id === context.userId) {
      throw new Error("You started this quest — delete it instead of leaving");
    }
    const { error } = await context.supabase
      .from("quest_participants")
      .delete()
      .eq("quest_id", data.questId)
      .eq("user_id", context.userId);
    if (error) {
      console.error("[leaveQuest]", error.message);
      throw new Error("Could not leave this quest");
    }
    return { ok: true };
  });
