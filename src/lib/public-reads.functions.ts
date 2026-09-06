import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

/**
 * Public, read-only projections used by guests.
 *
 * The `*_public` views mask private columns, but they run with
 * `security_invoker = on`, so anonymous visitors cannot read them directly
 * (their base tables intentionally grant nothing to `anon`). These server
 * functions read the very same masked views on the server, so signed-out
 * visitors get exactly the public columns and nothing more.
 */
async function admin() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}

function fail(scope: string, message: string | undefined): never {
  console.error(`[public-reads] ${scope}:`, message);
  throw new Error(scope);
}

const slugSchema = z.object({ slug: z.string().trim().min(1).max(200) });
const idSchema = z.object({ id: z.string().uuid() });
const limitSchema = z.object({ limit: z.number().int().min(1).max(200) });

export const getPublicProject = createServerFn({ method: "GET" })
  .inputValidator((input: unknown) => slugSchema.parse(input))
  .handler(async ({ data }) => {
    const db = await admin();
    const res = await db
      .from("project_stats")
      .select("*")
      .eq("slug", data.slug)
      .eq("published", true)
      .maybeSingle();
    if (res.error) fail("Could not load this project", res.error.message);
    return res.data ?? null;
  });

export const getPublicLeaderboard = createServerFn({ method: "GET" }).handler(async () => {
  const db = await admin();
  const res = await db
    .from("leaderboard")
    .select("*")
    .order("rank", { ascending: true })
    .limit(100);
  if (res.error) fail("Could not load the leaderboard", res.error.message);
  return res.data ?? [];
});

export const getPublicActivity = createServerFn({ method: "GET" })
  .inputValidator((input: unknown) =>
    limitSchema.extend({ username: z.string().trim().max(80).optional() }).parse(input),
  )
  .handler(async ({ data }) => {
    const db = await admin();
    let q = db.from("activity_public").select("*");
    if (data.username) q = q.eq("actor_username", data.username);
    const res = await q.order("created_at", { ascending: false }).limit(data.limit);
    if (res.error) fail("Could not load the activity feed", res.error.message);
    return res.data ?? [];
  });

export const getPublicComments = createServerFn({ method: "GET" })
  .inputValidator((input: unknown) => z.object({ projectId: z.string().uuid() }).parse(input))
  .handler(async ({ data }) => {
    const db = await admin();
    const res = await db
      .from("comments_public")
      .select("*")
      .eq("project_id", data.projectId)
      .order("created_at", { ascending: false })
      .limit(100);
    if (res.error) fail("Could not load feedback", res.error.message);
    return res.data ?? [];
  });

export const getPublicDiscussions = createServerFn({ method: "GET" }).handler(async () => {
  const db = await admin();
  const res = await db
    .from("discussions_public")
    .select("*")
    .order("pinned", { ascending: false })
    .order("last_activity_at", { ascending: false })
    .limit(100);
  if (res.error) fail("Could not load the forum", res.error.message);
  return res.data ?? [];
});

export const getPublicDiscussion = createServerFn({ method: "GET" })
  .inputValidator((input: unknown) => idSchema.parse(input))
  .handler(async ({ data }) => {
    const db = await admin();
    const res = await db.from("discussions_public").select("*").eq("id", data.id).maybeSingle();
    if (res.error) fail("Could not load this discussion", res.error.message);
    return res.data ?? null;
  });

export const getPublicReplies = createServerFn({ method: "GET" })
  .inputValidator((input: unknown) => z.object({ discussionId: z.string().uuid() }).parse(input))
  .handler(async ({ data }) => {
    const db = await admin();
    const res = await db
      .from("discussion_replies_public")
      .select("*")
      .eq("discussion_id", data.discussionId)
      .order("created_at", { ascending: true })
      .limit(200);
    if (res.error) fail("Could not load replies", res.error.message);
    return res.data ?? [];
  });

export const getPublicProfile = createServerFn({ method: "GET" })
  .inputValidator((input: unknown) =>
    z.object({ username: z.string().trim().max(80) }).parse(input),
  )
  .handler(async ({ data }) => {
    const db = await admin();
    const res = await db
      .from("profiles")
      .select(
        "id, username, display_name, avatar_url, bio, github_url, portfolio_url, accent_color, is_demo, created_at, updated_at",
      )
      .eq("username", data.username)
      .maybeSingle();
    if (res.error) fail("Could not load this profile", res.error.message);
    return res.data ?? null;
  });

export const getPublicFollowCounts = createServerFn({ method: "GET" })
  .inputValidator((input: unknown) =>
    z.object({ username: z.string().trim().max(80) }).parse(input),
  )
  .handler(async ({ data }) => {
    const db = await admin();
    const res = await db
      .from("follow_counts")
      .select("followers, following")
      .eq("username", data.username)
      .maybeSingle();
    if (res.error) fail("Could not load follower counts", res.error.message);
    return { followers: res.data?.followers ?? 0, following: res.data?.following ?? 0 };
  });

export const getPublicCollaborators = createServerFn({ method: "GET" })
  .inputValidator((input: unknown) => z.object({ projectId: z.string().uuid() }).parse(input))
  .handler(async ({ data }) => {
    const db = await admin();
    const res = await db
      .from("project_collaborators_public")
      .select("id, project_id, user_id, can_edit, username, display_name, avatar_url, accent_color")
      .eq("project_id", data.projectId)
      .order("created_at", { ascending: true });
    if (res.error) fail("Could not load collaborators", res.error.message);
    return res.data ?? [];
  });

export const getPublicCommunityTotals = createServerFn({ method: "GET" }).handler(async () => {
  const zero = {
    builders: 0,
    projects_published: 0,
    upvotes: 0,
    upvotes_week: 0,
    projects_week: 0,
  };
  try {
    const db = await admin();
    const res = await db.from("community_totals").select("*").maybeSingle();
    if (res.error) {
      // Totals are decorative: never let a hiccup here blank out the page.
      console.error("[public-reads] community totals:", res.error.message);
      return zero;
    }
    return {
      builders: res.data?.builders ?? 0,
      projects_published: res.data?.projects_published ?? 0,
      upvotes: res.data?.upvotes ?? 0,
      upvotes_week: res.data?.upvotes_week ?? 0,
      projects_week: res.data?.projects_week ?? 0,
    };
  } catch (error) {
    console.error("[public-reads] community totals threw:", error);
    return zero;
  }
});


export type WeeklyStanding = {
  id: string;
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
  accent_color: string | null;
  score: number;
  project_count: number;
  rank: number;
  top_project_title: string | null;
};

/**
 * Standings for one race week. Only votes cast inside the window count, so the
 * weekly race resets while all-time totals stay untouched.
 */
export const getPublicWeeklyLeaderboard = createServerFn({ method: "GET" })
  .inputValidator((input: unknown) =>
    z
      .object({ startsAt: z.string().min(4), endsAt: z.string().min(4) })
      .parse(input),
  )
  .handler(async ({ data }): Promise<WeeklyStanding[]> => {
    const db = await admin();
    const votes = await db
      .from("votes")
      .select("project_id")
      .gte("created_at", data.startsAt)
      .lt("created_at", data.endsAt);
    if (votes.error) fail("Could not load this week's standings", votes.error.message);

    const projects = await db
      .from("projects")
      .select("id, owner_id, title")
      .eq("published", true);
    if (projects.error) fail("Could not load this week's standings", projects.error.message);

    const rows = projects.data ?? [];
    const ownerIds = [...new Set(rows.map((p) => p.owner_id))];
    const profiles = ownerIds.length
      ? await db
          .from("profiles")
          .select("id, username, display_name, avatar_url, accent_color")
          .in("id", ownerIds)
      : { data: [], error: null };
    if (profiles.error) fail("Could not load this week's standings", profiles.error.message);

    const perProject = new Map<string, number>();
    for (const v of votes.data ?? []) {
      perProject.set(v.project_id, (perProject.get(v.project_id) ?? 0) + 1);
    }

    const byOwner = new Map<string, { score: number; projects: number; top: [string, number] }>();
    for (const p of rows) {
      const score = perProject.get(p.id) ?? 0;
      const entry = byOwner.get(p.owner_id) ?? { score: 0, projects: 0, top: [p.title, -1] as [string, number] };
      entry.score += score;
      entry.projects += 1;
      if (score > entry.top[1]) entry.top = [p.title, score];
      byOwner.set(p.owner_id, entry);
    }

    return (profiles.data ?? [])
      .map((profile) => {
        const entry = byOwner.get(profile.id);
        return {
          id: profile.id,
          username: profile.username,
          display_name: profile.display_name,
          avatar_url: profile.avatar_url,
          accent_color: profile.accent_color,
          score: entry?.score ?? 0,
          project_count: entry?.projects ?? 0,
          top_project_title: entry?.top[0] ?? null,
          rank: 0,
        };
      })
      .sort((a, b) => b.score - a.score || (a.display_name ?? "").localeCompare(b.display_name ?? ""))
      .map((row, i) => ({ ...row, rank: i + 1 }));
  });
