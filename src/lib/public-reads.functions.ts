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
  const res = await db.from("leaderboard").select("*").order("rank", { ascending: true }).limit(100);
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
  .inputValidator((input: unknown) => z.object({ username: z.string().trim().max(80) }).parse(input))
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
