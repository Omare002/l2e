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

/** Every quest, newest first. Finished quests get their winner recorded first. */
export const getPublicQuests = createServerFn({ method: "GET" }).handler(async () => {
  const db = await admin();
  await closeFinished(db);
  const res = await db
    .from("quests")
    .select(
      "*, creator:profiles!quests_creator_id_fkey(username, display_name, avatar_url, accent_color), winner:profiles!quests_winner_id_fkey(username, display_name), task:weekly_tasks(title), participants:quest_participants(id, status)",
    )
    .order("created_at", { ascending: false })
    .limit(60);
  if (res.error) {
    console.error("[getPublicQuests]", res.error.message);
    return [];
  }
  return res.data ?? [];
});

/** One quest plus live standings, readable by guests. */
export const getPublicQuest = createServerFn({ method: "GET" })
  .inputValidator((input: unknown) => idSchema.parse(input))
  .handler(async ({ data }) => {
    const db = await admin();
    await closeFinished(db);

    const quest = await db
      .from("quests")
      .select(
        "*, creator:profiles!quests_creator_id_fkey(username, display_name, avatar_url, accent_color), winner:profiles!quests_winner_id_fkey(username, display_name), task:weekly_tasks(title, prompt)",
      )
      .eq("id", data.questId)
      .maybeSingle();
    if (quest.error) console.error("[getPublicQuest]", quest.error.message);
    if (!quest.data) return null;

    const standings = await db.rpc("quest_standings", { _quest_id: data.questId });
    if (standings.error) console.error("[getPublicQuest/standings]", standings.error.message);

    return { quest: quest.data, standings: standings.data ?? [] };
  });

/** Quests the signed-in member created, joined, or was invited to. */
export const getMyQuests = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const res = await context.supabase
      .from("quest_participants")
      .select(
        "id, status, project_id, quest:quests(id, title, kind, ends_at, closed_at, winner_id, creator_id)",
      )
      .eq("user_id", context.userId)
      .order("created_at", { ascending: false });
    if (res.error) {
      console.error("[getMyQuests]", res.error.message);
      return [];
    }
    return res.data ?? [];
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
    if (data.projectId) {
      const owns = await context.supabase
        .from("projects")
        .select("id")
        .eq("id", data.projectId)
        .eq("owner_id", context.userId)
        .maybeSingle();
      if (!owns.data) throw new Error("You can only enter your own project");
    }

    const { error } = await context.supabase
      .from("quest_participants")
      .update({ project_id: data.projectId, status: "accepted" })
      .eq("quest_id", data.questId)
      .eq("user_id", context.userId);
    if (error) {
      console.error("[submitQuestProject]", error.message);
      throw new Error("Could not enter your project");
    }
    return { ok: true };
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
