import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

/**
 * Public, read-only project stats (views / upvotes / feedback) plus a
 * per-week history. Reads go through the server so signed-out visitors can
 * see the numbers without any table being exposed to `anon`.
 */
async function admin() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}

export type WeekBucket = {
  /** ISO date of the Monday that starts the week. */
  week_start: string;
  views: number;
  upvotes: number;
  comments: number;
};

export type ProjectStatsReport = {
  title: string;
  slug: string;
  views: number;
  upvotes: number;
  comments: number;
  weeks: WeekBucket[];
};

const slugSchema = z.object({ slug: z.string().trim().min(1).max(200) });

function mondayOf(iso: string) {
  const d = new Date(iso);
  const day = (d.getUTCDay() + 6) % 7;
  return new Date(
    Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() - day),
  ).toISOString().slice(0, 10);
}

/** Records one view. Silently ignores failures — it must never break a page. */
export const recordProjectView = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) =>
    z.object({ projectId: z.string().uuid(), viewerId: z.string().uuid().nullish() }).parse(input),
  )
  .handler(async ({ data }) => {
    try {
      const db = await admin();
      await db
        .from("project_views")
        .insert({ project_id: data.projectId, viewer_id: data.viewerId ?? null });
    } catch (error) {
      console.error("[project-stats] view insert:", error);
    }
    return { ok: true };
  });

export const getProjectStatsReport = createServerFn({ method: "GET" })
  .inputValidator((input: unknown) => slugSchema.parse(input))
  .handler(async ({ data }): Promise<ProjectStatsReport | null> => {
    const db = await admin();
    const project = await db
      .from("projects")
      .select("id, title, slug, published")
      .eq("slug", data.slug)
      .eq("published", true)
      .maybeSingle();
    if (project.error) {
      console.error("[project-stats] project:", project.error.message);
      throw new Error("Could not load these stats");
    }
    if (!project.data) return null;

    const id = project.data.id;
    const since = new Date(Date.now() - 12 * 7 * 86400000).toISOString();

    const [views, votes, comments] = await Promise.all([
      db.from("project_views").select("created_at").eq("project_id", id),
      db.from("votes").select("created_at").eq("project_id", id),
      db.from("comments").select("created_at").eq("project_id", id),
    ]);

    const buckets = new Map<string, WeekBucket>();
    // Always show the last 12 weeks so an empty week reads as zero, not a gap.
    const thisMonday = mondayOf(new Date().toISOString());
    for (let i = 11; i >= 0; i -= 1) {
      const week = new Date(new Date(`${thisMonday}T00:00:00Z`).getTime() - i * 7 * 86400000)
        .toISOString()
        .slice(0, 10);
      buckets.set(week, { week_start: week, views: 0, upvotes: 0, comments: 0 });
    }

    function tally(rows: { created_at: string }[] | null, key: keyof Omit<WeekBucket, "week_start">) {
      for (const row of rows ?? []) {
        if (row.created_at < since) continue;
        const bucket = buckets.get(mondayOf(row.created_at));
        if (bucket) bucket[key] += 1;
      }
    }

    tally(views.data, "views");
    tally(votes.data, "upvotes");
    tally(comments.data, "comments");

    return {
      title: project.data.title,
      slug: project.data.slug,
      views: views.data?.length ?? 0,
      upvotes: votes.data?.length ?? 0,
      comments: comments.data?.length ?? 0,
      weeks: [...buckets.values()],
    };
  });
