import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

/**
 * Public builder directory search.
 *
 * Runs on the server so signed-out visitors get exactly the public columns
 * (never emails or private profile fields). Usernames are unique in the
 * database, so a match is always one person.
 */
async function admin() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}

export type DirectoryBuilder = {
  id: string;
  username: string;
  display_name: string;
  avatar_url: string | null;
  accent_color: string;
  score: number;
  rank: number | null;
  project_count: number;
};

const searchSchema = z.object({
  term: z.string().trim().max(60).default(""),
  limit: z.number().int().min(1).max(40).default(24),
});

export const searchPublicBuilders = createServerFn({ method: "GET" })
  .inputValidator((input: unknown) => searchSchema.parse(input))
  .handler(async ({ data }): Promise<DirectoryBuilder[]> => {
    try {
      const db = await admin();
      // PostgREST treats , ( ) . % _ as filter syntax, so escape them.
      const term = data.term.replace(/[%_,()."\\]/g, (c) => `\\${c}`);

      let q = db
        .from("leaderboard")
        .select("id, username, display_name, avatar_url, accent_color, score, rank, project_count");
      if (term) q = q.or(`username.ilike.%${term}%,display_name.ilike.%${term}%`);
      const ranked = await q.order("rank", { ascending: true }).limit(data.limit);
      if (ranked.error) {
        console.error("[discovery] ranked search:", ranked.error.message);
        return [];
      }

      const rows = (ranked.data ?? []).map((r) => ({
        id: r.id as string,
        username: (r.username as string) ?? "",
        display_name: (r.display_name as string) ?? "",
        avatar_url: (r.avatar_url as string | null) ?? null,
        accent_color: (r.accent_color as string) ?? "#9BE564",
        score: (r.score as number) ?? 0,
        rank: (r.rank as number | null) ?? null,
        project_count: (r.project_count as number) ?? 0,
      }));

      // The leaderboard only holds builders with projects. Top up with
      // matching profiles so every real account is discoverable.
      if (rows.length < data.limit) {
        const seen = new Set(rows.map((r) => r.id));
        let p = db.from("profiles").select("id, username, display_name, avatar_url, accent_color");
        if (term) p = p.or(`username.ilike.%${term}%,display_name.ilike.%${term}%`);
        const extra = await p.order("created_at", { ascending: false }).limit(data.limit);
        if (!extra.error) {
          for (const r of extra.data ?? []) {
            if (seen.has(r.id) || rows.length >= data.limit) continue;
            rows.push({
              id: r.id,
              username: r.username,
              display_name: r.display_name,
              avatar_url: r.avatar_url,
              accent_color: r.accent_color ?? "#9BE564",
              score: 0,
              rank: null,
              project_count: 0,
            });
          }
        }
      }

      return rows;
    } catch (error) {
      console.error("[discovery] search threw:", error);
      return [];
    }
  });
