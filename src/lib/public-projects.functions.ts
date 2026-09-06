import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import type { ProjectStats, ProjectSort } from "@/lib/db";
import { normalizeCategory } from "@/data/community";

const inputSchema = z.object({
  sort: z.enum(["Trending", "Newest", "Most Voted", "Most Commented", "Recently Updated"]),
  category: z.string().trim().max(60),
  limit: z.number().int().min(1).max(100),
});

function compareProjects(a: ProjectStats, b: ProjectStats, sort: ProjectSort) {
  if (sort === "Newest") {
    return (b.created_at ?? "").localeCompare(a.created_at ?? "");
  }
  if (sort === "Recently Updated") {
    return (b.updated_at ?? "").localeCompare(a.updated_at ?? "");
  }
  if (sort === "Most Commented") {
    return (b.comment_count ?? 0) - (a.comment_count ?? 0) || (b.created_at ?? "").localeCompare(a.created_at ?? "");
  }
  if (sort === "Most Voted") {
    return (b.vote_count ?? 0) - (a.vote_count ?? 0) || (b.created_at ?? "").localeCompare(a.created_at ?? "");
  }
  return (
    (b.vote_count ?? 0) - (a.vote_count ?? 0) ||
    (b.comment_count ?? 0) - (a.comment_count ?? 0) ||
    (b.created_at ?? "").localeCompare(a.created_at ?? "")
  );
}

export const getPublicProjects = createServerFn({ method: "GET" })
  .inputValidator((input: unknown) => inputSchema.parse(input))
  .handler(async ({ data }): Promise<ProjectStats[]> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const projectResult = await supabaseAdmin
      .from("projects")
      .select(
        "id, owner_id, slug, title, tagline, description, demo_url, github_url, thumbnail_url, category, tech, status, published, created_at, updated_at",
      )
      .eq("published", true);

    if (projectResult.error) {
      console.error("[public-projects] Could not load projects:", projectResult.error.message);
      throw new Error("Could not load projects");
    }

    // Every row keeps a valid track, so filtering can never drop a project
    // because its stored category is missing or unrecognised.
    const projects = (projectResult.data ?? [])
      .map((project) => ({ ...project, category: normalizeCategory(project.category) as string }))
      .filter((project) => data.category === "All" || project.category === data.category);
    const ownerIds = [...new Set(projects.map((project) => project.owner_id))];
    const projectIds = projects.map((project) => project.id);

    const [profilesResult, votesResult, commentsResult] = await Promise.all([
      ownerIds.length
        ? supabaseAdmin
            .from("profiles")
            .select("id, username, display_name, avatar_url, accent_color, is_demo")
            .in("id", ownerIds)
        : Promise.resolve({ data: [], error: null }),
      projectIds.length
        ? supabaseAdmin.from("votes").select("project_id") .in("project_id", projectIds)
        : Promise.resolve({ data: [], error: null }),
      projectIds.length
        ? supabaseAdmin.from("comments").select("project_id").in("project_id", projectIds)
        : Promise.resolve({ data: [], error: null }),
    ]);

    if (profilesResult.error || votesResult.error || commentsResult.error) {
      const error = profilesResult.error ?? votesResult.error ?? commentsResult.error;
      console.error("[public-projects] Could not load project details:", error?.message);
      throw new Error("Could not load projects");
    }

    const profiles = new Map((profilesResult.data ?? []).map((profile) => [profile.id, profile]));
    const voteCounts = new Map<string, number>();
    const commentCounts = new Map<string, number>();
    for (const vote of votesResult.data ?? []) {
      voteCounts.set(vote.project_id, (voteCounts.get(vote.project_id) ?? 0) + 1);
    }
    for (const comment of commentsResult.data ?? []) {
      commentCounts.set(comment.project_id, (commentCounts.get(comment.project_id) ?? 0) + 1);
    }

    return projects
      .map((project) => {
        const owner = profiles.get(project.owner_id);
        return {
          ...project,
          vote_count: voteCounts.get(project.id) ?? 0,
          comment_count: commentCounts.get(project.id) ?? 0,
          owner_username: owner?.username ?? null,
          owner_display_name: owner?.display_name ?? null,
          owner_avatar_url: owner?.avatar_url ?? null,
          owner_accent_color: owner?.accent_color ?? null,
          owner_is_demo: owner?.is_demo ?? null,
        } satisfies ProjectStats;
      })
      .sort((a, b) => compareProjects(a, b, data.sort as ProjectSort))
      .slice(0, data.limit);
  });