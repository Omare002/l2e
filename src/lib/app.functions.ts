import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import {
  commentInputSchema,
  avatarInputSchema,
  profileInputSchema,
  projectInputSchema,
  slugify,
} from "@/lib/validation";

export const ensureMyProfile = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { ensureProfile } = await import("@/lib/profile.server");
    return ensureProfile(context.supabase as never, context.userId, context.claims as never);
  });

export const saveProfile = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => profileInputSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { ensureProfile, removeStoredImage } = await import("@/lib/profile.server");
    const current = await ensureProfile(
      context.supabase as never,
      context.userId,
      context.claims as never,
    );

    if (data.username !== current.username) {
      const taken = await context.supabase
        .from("profiles")
        .select("id")
        .eq("username", data.username)
        .neq("id", context.userId)
        .maybeSingle();
      if (taken.data) throw new Error("That username is already taken");
    }

    const { data: updated, error } = await context.supabase
      .from("profiles")
      .update({
        username: data.username,
        display_name: data.displayName,
        bio: data.bio ?? null,
        github_url: data.githubUrl ?? null,
        portfolio_url: data.portfolioUrl ?? null,
        avatar_url: data.avatarPath ?? null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", context.userId)
      .select("*")
      .single();

    if (error) {
      console.error("[saveProfile]", error.message);
      throw new Error("Could not save your profile");
    }

    if (current.avatar_url && current.avatar_url !== updated.avatar_url) {
      await removeStoredImage(context.supabase as never, "avatars", current.avatar_url, context.userId);
    }
    return updated;
  });

export const saveAvatar = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => avatarInputSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { ensureProfile, removeStoredImage } = await import("@/lib/profile.server");
    const current = await ensureProfile(
      context.supabase as never,
      context.userId,
      context.claims as never,
    );

    if (data.avatarPath && !data.avatarPath.startsWith(`${context.userId}/`)) {
      throw new Error("Invalid image");
    }

    const { data: updated, error } = await context.supabase
      .from("profiles")
      .update({ avatar_url: data.avatarPath ?? null, updated_at: new Date().toISOString() })
      .eq("id", context.userId)
      .select("*")
      .single();

    if (error) {
      console.error("[saveAvatar]", error.message);
      throw new Error("Could not update your photo");
    }

    if (current.avatar_url && current.avatar_url !== updated.avatar_url) {
      await removeStoredImage(
        context.supabase as never,
        "avatars",
        current.avatar_url,
        context.userId,
      );
    }
    return updated;
  });

export const saveProject = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => projectInputSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { ensureProfile, uniqueSlug, removeStoredImage } = await import("@/lib/profile.server");
    await ensureProfile(context.supabase as never, context.userId, context.claims as never);

    const payload = {
      title: data.title,
      tagline: data.tagline,
      description: data.description,
      category: data.category,
      status: data.status,
      demo_url: data.demoUrl ?? null,
      github_url: data.githubUrl ?? null,
      thumbnail_url: data.thumbnailPath ?? null,
      tech: data.tech ?? [],
      published: data.published,
    };

    if (data.id) {
      const existing = await context.supabase
        .from("projects")
        .select("*")
        .eq("id", data.id)
        .maybeSingle();
      if (!existing.data || existing.data.owner_id !== context.userId) {
        throw new Error("You can only edit your own projects");
      }
      const slug =
        existing.data.title === data.title
          ? existing.data.slug
          : await uniqueSlug(context.supabase as never, slugify(data.title), data.id);

      const { data: updated, error } = await context.supabase
        .from("projects")
        .update({ ...payload, slug, updated_at: new Date().toISOString() })
        .eq("id", data.id)
        .select("*")
        .single();
      if (error) {
        console.error("[saveProject:update]", error.message);
        throw new Error("Could not save your project");
      }
      if (existing.data.thumbnail_url && existing.data.thumbnail_url !== updated.thumbnail_url) {
        await removeStoredImage(
          context.supabase as never,
          "thumbnails",
          existing.data.thumbnail_url,
          context.userId,
        );
      }
      return updated;
    }

    const slug = await uniqueSlug(context.supabase as never, slugify(data.title));
    const { data: created, error } = await context.supabase
      .from("projects")
      .insert({ ...payload, slug, owner_id: context.userId })
      .select("*")
      .single();
    if (error) {
      console.error("[saveProject:insert]", error.message);
      throw new Error("Could not publish your project");
    }
    return created;
  });

export const deleteProject = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { id: string }) => {
    if (!input?.id) throw new Error("Missing project");
    return { id: input.id };
  })
  .handler(async ({ data, context }) => {
    const { removeStoredImage } = await import("@/lib/profile.server");
    const existing = await context.supabase
      .from("projects")
      .select("id, owner_id, thumbnail_url")
      .eq("id", data.id)
      .maybeSingle();
    if (!existing.data || existing.data.owner_id !== context.userId) {
      throw new Error("You can only delete your own projects");
    }
    const { error } = await context.supabase.from("projects").delete().eq("id", data.id);
    if (error) {
      console.error("[deleteProject]", error.message);
      throw new Error("Could not delete this project");
    }
    await removeStoredImage(
      context.supabase as never,
      "thumbnails",
      existing.data.thumbnail_url,
      context.userId,
    );
    return { ok: true };
  });

export const toggleVote = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { projectId: string }) => {
    if (!input?.projectId) throw new Error("Missing project");
    return { projectId: input.projectId };
  })
  .handler(async ({ data, context }) => {
    const { ensureProfile } = await import("@/lib/profile.server");
    await ensureProfile(context.supabase as never, context.userId, context.claims as never);

    const existing = await context.supabase
      .from("votes")
      .select("id")
      .eq("project_id", data.projectId)
      .eq("user_id", context.userId)
      .maybeSingle();

    if (existing.data) {
      const { error } = await context.supabase.from("votes").delete().eq("id", existing.data.id);
      if (error) {
        console.error("[toggleVote:delete]", error.message);
        throw new Error("Could not remove your upvote");
      }
    } else {
      const { error } = await context.supabase
        .from("votes")
        .insert({ project_id: data.projectId, user_id: context.userId });
      if (error) {
        console.error("[toggleVote:insert]", error.message);
        throw new Error("Could not register your upvote");
      }
    }

    const { count } = await context.supabase
      .from("votes")
      .select("id", { count: "exact", head: true })
      .eq("project_id", data.projectId);

    return { voted: !existing.data, count: count ?? 0 };
  });

export const addComment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => commentInputSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { ensureProfile } = await import("@/lib/profile.server");
    await ensureProfile(context.supabase as never, context.userId, context.claims as never);

    const { data: created, error } = await context.supabase
      .from("comments")
      .insert({ project_id: data.projectId, body: data.body, kind: data.kind, author_id: context.userId })
      .select("*")
      .single();
    if (error) {
      console.error("[addComment]", error.message);
      throw new Error("Could not post your feedback");
    }
    return created;
  });

export const deleteComment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { id: string }) => {
    if (!input?.id) throw new Error("Missing comment");
    return { id: input.id };
  })
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("comments")
      .delete()
      .eq("id", data.id)
      .eq("author_id", context.userId);
    if (error) {
      console.error("[deleteComment]", error.message);
      throw new Error("Could not delete this comment");
    }
    return { ok: true };
  });

export const editComment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { id: string; body: string }) => {
    if (!input?.id) throw new Error("Missing comment");
    const body = (input.body ?? "").trim();
    if (body.length < 2) throw new Error("Say a little more");
    return { id: input.id, body: body.slice(0, 1000) };
  })
  .handler(async ({ data, context }) => {
    const { data: updated, error } = await context.supabase
      .from("comments")
      .update({ body: data.body })
      .eq("id", data.id)
      .eq("author_id", context.userId)
      .select("*")
      .maybeSingle();
    if (error || !updated) {
      console.error("[editComment]", error?.message);
      throw new Error("Could not save your feedback");
    }
    return updated;
  });
