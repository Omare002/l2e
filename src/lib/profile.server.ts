import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

type Client = SupabaseClient<Database>;

function baseUsername(email: string | undefined, userId: string) {
  const raw = (email ?? "").split("@")[0] ?? "";
  const cleaned = raw.toLowerCase().replace(/[^a-z0-9_-]+/g, "");
  return cleaned.length >= 2 ? cleaned.slice(0, 24) : `builder-${userId.slice(0, 6)}`;
}

/** Guarantees the signed-in user owns a profile row before any write that references it. */
export async function ensureProfile(
  supabase: Client,
  userId: string,
  claims: Record<string, unknown>,
) {
  const existing = await supabase.from("profiles").select("*").eq("id", userId).maybeSingle();
  if (existing.data) return existing.data;

  const email = typeof claims["email"] === "string" ? (claims["email"] as string) : undefined;
  const meta = (claims["user_metadata"] ?? {}) as Record<string, unknown>;
  const metaName = [meta["full_name"], meta["name"], meta["user_name"]].find(
    (v): v is string => typeof v === "string" && v.trim().length > 0,
  );
  const desired = typeof meta["username"] === "string" ? (meta["username"] as string) : undefined;

  let username = (desired ?? baseUsername(email, userId)).toLowerCase().replace(/[^a-z0-9_-]+/g, "");
  if (username.length < 2) username = `builder-${userId.slice(0, 6)}`;

  for (let attempt = 0; attempt < 6; attempt += 1) {
    const candidate = attempt === 0 ? username : `${username}-${attempt + 1}`;
    const { data, error } = await supabase
      .from("profiles")
      .insert({
        id: userId,
        username: candidate,
        display_name: metaName ?? candidate,
        avatar_url: null,
      })
      .select("*")
      .single();
    if (data) return data;
    if (error && !error.message.toLowerCase().includes("duplicate")) {
      console.error("[profile] create failed:", error.message);
      throw new Error("Could not set up your profile");
    }
    const retry = await supabase.from("profiles").select("*").eq("id", userId).maybeSingle();
    if (retry.data) return retry.data;
  }
  throw new Error("Could not set up your profile");
}

export async function uniqueSlug(supabase: Client, base: string, ignoreId?: string) {
  for (let attempt = 0; attempt < 8; attempt += 1) {
    const candidate = attempt === 0 ? base : `${base}-${attempt + 1}`;
    let query = supabase.from("projects").select("id").eq("slug", candidate);
    if (ignoreId) query = query.neq("id", ignoreId);
    const { data } = await query.maybeSingle();
    if (!data) return candidate;
  }
  return `${base}-${Math.random().toString(36).slice(2, 7)}`;
}

export async function removeStoredImage(
  supabase: Client,
  bucket: "avatars" | "thumbnails",
  path: string | null | undefined,
  userId: string,
) {
  if (!path || !path.startsWith(`${userId}/`)) return;
  await supabase.storage.from(bucket).remove([path]);
}
