import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import {
  copyrightComplaintSchema,
  moderationActionSchema,
  reportInputSchema,
  reportStatusSchema,
  updateReportStatusSchema,
  complaintStatusSchema,
} from "@/lib/validation";

type Target = "project" | "discussion" | "discussion_reply" | "comment" | "profile";

async function admin() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}

/** Everything a moderator needs to judge a report without leaking private columns. */
type TargetInfo = {
  ownerId: string | null;
  title: string;
  excerpt: string;
  link: string | null;
  hidden: boolean;
};

async function loadTarget(type: Target, id: string): Promise<TargetInfo | null> {
  const db = await admin();
  if (type === "project") {
    const { data } = await db
      .from("projects")
      .select("id, title, tagline, slug, owner_id, hidden")
      .eq("id", id)
      .maybeSingle();
    if (!data) return null;
    return {
      ownerId: data.owner_id,
      title: data.title,
      excerpt: data.tagline ?? "",
      link: `/projects/${data.slug}`,
      hidden: data.hidden ?? false,
    };
  }
  if (type === "discussion") {
    const { data } = await db
      .from("discussions")
      .select("id, title, body, author_id, hidden")
      .eq("id", id)
      .maybeSingle();
    if (!data) return null;
    return {
      ownerId: data.author_id,
      title: data.title,
      excerpt: (data.body ?? "").slice(0, 300),
      link: `/forum/${data.id}`,
      hidden: data.hidden ?? false,
    };
  }
  if (type === "discussion_reply") {
    const { data } = await db
      .from("discussion_replies")
      .select("id, body, author_id, discussion_id, hidden")
      .eq("id", id)
      .maybeSingle();
    if (!data) return null;
    return {
      ownerId: data.author_id,
      title: "Forum reply",
      excerpt: (data.body ?? "").slice(0, 300),
      link: `/forum/${data.discussion_id}`,
      hidden: data.hidden ?? false,
    };
  }
  if (type === "comment") {
    const { data } = await db
      .from("comments")
      .select("id, body, author_id, project_id, hidden")
      .eq("id", id)
      .maybeSingle();
    if (!data) return null;
    const project = await db
      .from("projects")
      .select("slug, title")
      .eq("id", data.project_id)
      .maybeSingle();
    return {
      ownerId: data.author_id,
      title: `Comment on ${project.data?.title ?? "a project"}`,
      excerpt: (data.body ?? "").slice(0, 300),
      link: project.data?.slug ? `/projects/${project.data.slug}` : null,
      hidden: data.hidden ?? false,
    };
  }
  const { data } = await db
    .from("profiles")
    .select("id, username, display_name, bio, suspended_at")
    .eq("id", id)
    .maybeSingle();
  if (!data) return null;
  return {
    ownerId: data.id,
    title: `@${data.username}`,
    excerpt: data.bio ?? data.display_name ?? "",
    link: `/builders/${data.username}`,
    hidden: Boolean(data.suspended_at),
  };
}

async function requireStaff(userId: string) {
  const db = await admin();
  const { data } = await db
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .in("role", ["admin", "moderator"]);
  if (!data || data.length === 0) throw new Error("You don't have access to the moderation queue");
  return data.some((r) => r.role === "admin") ? "admin" : "moderator";
}

/** Tells the UI whether to show moderation entry points. Never throws. */
export const myModerationAccess = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const db = await admin();
    const { data } = await db.from("user_roles").select("role").eq("user_id", context.userId);
    const roles = (data ?? []).map((r) => r.role as string);
    return {
      isStaff: roles.includes("admin") || roles.includes("moderator"),
      isAdmin: roles.includes("admin"),
    };
  });

export const submitReport = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => reportInputSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { ensureProfile } = await import("@/lib/profile.server");
    await ensureProfile(context.supabase as never, context.userId, context.claims as never);
    const db = await admin();

    const target = await loadTarget(data.targetType as Target, data.targetId);
    if (!target) throw new Error("That content no longer exists");
    if (target.ownerId && target.ownerId === context.userId) {
      throw new Error("You can't report your own content");
    }

    const existing = await db
      .from("reports")
      .select("id")
      .eq("reporter_id", context.userId)
      .eq("target_type", data.targetType)
      .eq("target_id", data.targetId)
      .maybeSingle();
    if (existing.data) throw new Error("You've already reported this — our team is on it");

    // Light spam guard: a handful of reports per day is plenty for real use.
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const recent = await db
      .from("reports")
      .select("id", { count: "exact", head: true })
      .eq("reporter_id", context.userId)
      .gte("created_at", since);
    if ((recent.count ?? 0) >= 10) {
      throw new Error("You've sent a lot of reports today. Please try again tomorrow.");
    }

    const { error } = await db.from("reports").insert({
      reporter_id: context.userId,
      target_type: data.targetType,
      target_id: data.targetId,
      reported_user_id: target.ownerId,
      reason: data.reason,
      details: data.details ?? null,
    });
    if (error) {
      console.error("[submitReport]", error.message);
      if (error.message.toLowerCase().includes("duplicate")) {
        throw new Error("You've already reported this — our team is on it");
      }
      throw new Error("Could not send your report");
    }
    return { ok: true };
  });

export const myReports = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const res = await context.supabase
      .from("reports")
      .select("id, target_type, reason, status, details, created_at")
      .eq("reporter_id", context.userId)
      .order("created_at", { ascending: false })
      .limit(50);
    if (res.error) {
      console.error("[myReports]", res.error.message);
      throw new Error("Could not load your reports");
    }
    return res.data ?? [];
  });

export type ModerationReport = {
  id: string;
  target_type: string;
  target_id: string;
  reason: string;
  details: string | null;
  status: string;
  resolution_note: string | null;
  created_at: string;
  reviewed_at: string | null;
  reporter: { username: string; display_name: string } | null;
  reported_user: { id: string; username: string; display_name: string; suspended: boolean } | null;
  target: TargetInfo | null;
  duplicate_count: number;
};

export const listReports = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => reportStatusSchema.parse(input))
  .handler(async ({ data, context }): Promise<ModerationReport[]> => {
    await requireStaff(context.userId);
    const db = await admin();
    let query = db
      .from("reports")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(200);
    if (data.status !== "all") query = query.eq("status", data.status as never);
    const res = await query;
    if (res.error) {
      console.error("[listReports]", res.error.message);
      throw new Error("Could not load the moderation queue");
    }
    const rows = res.data ?? [];

    const profileIds = [
      ...new Set(
        rows.flatMap((r) => [r.reporter_id, r.reported_user_id].filter(Boolean) as string[]),
      ),
    ];
    const profiles = profileIds.length
      ? await db
          .from("profiles")
          .select("id, username, display_name, suspended_at")
          .in("id", profileIds)
      : { data: [] as { id: string; username: string; display_name: string; suspended_at: string | null }[] };
    const byId = new Map((profiles.data ?? []).map((p) => [p.id, p]));

    const targets = await Promise.all(
      rows.map((r) => loadTarget(r.target_type as Target, r.target_id).catch(() => null)),
    );

    const counts = new Map<string, number>();
    for (const r of rows) {
      const key = `${r.target_type}:${r.target_id}`;
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }

    return rows.map((r, index) => {
      const reporter = byId.get(r.reporter_id);
      const reported = r.reported_user_id ? byId.get(r.reported_user_id) : undefined;
      return {
        id: r.id,
        target_type: r.target_type as string,
        target_id: r.target_id,
        reason: r.reason as string,
        details: r.details,
        status: r.status as string,
        resolution_note: r.resolution_note,
        created_at: r.created_at,
        reviewed_at: r.reviewed_at,
        reporter: reporter
          ? { username: reporter.username, display_name: reporter.display_name }
          : null,
        reported_user: reported
          ? {
              id: reported.id,
              username: reported.username,
              display_name: reported.display_name,
              suspended: Boolean(reported.suspended_at),
            }
          : null,
        target: targets[index] ?? null,
        duplicate_count: counts.get(`${r.target_type}:${r.target_id}`) ?? 1,
      };
    });
  });

export const setReportStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => updateReportStatusSchema.parse(input))
  .handler(async ({ data, context }) => {
    await requireStaff(context.userId);
    const db = await admin();
    const { error } = await db
      .from("reports")
      .update({
        status: data.status as never,
        reviewed_by: context.userId,
        reviewed_at: new Date().toISOString(),
      })
      .eq("id", data.id);
    if (error) {
      console.error("[setReportStatus]", error.message);
      throw new Error("Could not update this report");
    }
    return { ok: true };
  });

async function notify(userId: string | null, type: string, body: string) {
  if (!userId) return;
  const db = await admin();
  await db.from("notifications").insert({ user_id: userId, type, body: body.slice(0, 140) });
}

/**
 * Applies a moderator decision. Content is only ever hidden or restored —
 * nothing is deleted automatically because it was reported.
 */
export const applyModerationAction = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => moderationActionSchema.parse(input))
  .handler(async ({ data, context }) => {
    await requireStaff(context.userId);
    const db = await admin();

    const report = await db.from("reports").select("*").eq("id", data.reportId).maybeSingle();
    if (!report.data) throw new Error("That report no longer exists");
    const row = report.data;
    const targetType = row.target_type as Target;
    const target = await loadTarget(targetType, row.target_id);

    if (data.action === "hide_content" || data.action === "unhide_content") {
      const hide = data.action === "hide_content";
      if (targetType === "profile") throw new Error("Use suspend for accounts, not hide");
      const table =
        targetType === "project"
          ? "projects"
          : targetType === "discussion"
            ? "discussions"
            : targetType === "discussion_reply"
              ? "discussion_replies"
              : "comments";
      const { error } = await db.from(table).update({ hidden: hide }).eq("id", row.target_id);
      if (error) {
        console.error("[moderation:hide]", error.message);
        throw new Error("Could not change this content's visibility");
      }
      await notify(
        target?.ownerId ?? row.reported_user_id,
        hide ? "content_hidden" : "content_restored",
        hide
          ? `A moderator hid your ${targetType.replace("_", " ")} while it is reviewed.`
          : `Your ${targetType.replace("_", " ")} is visible again.`,
      );
    }

    if (data.action === "suspend_account" || data.action === "unsuspend_account") {
      const suspend = data.action === "suspend_account";
      const affected = row.reported_user_id ?? target?.ownerId ?? null;
      if (!affected) throw new Error("There is no account attached to this report");
      const { error } = await db
        .from("profiles")
        .update({
          suspended_at: suspend ? new Date().toISOString() : null,
          suspension_reason: suspend ? (data.notes ?? "Community guidelines") : null,
        })
        .eq("id", affected);
      if (error) {
        console.error("[moderation:suspend]", error.message);
        throw new Error("Could not change this account's status");
      }
      await notify(
        affected,
        suspend ? "account_suspended" : "account_restored",
        suspend
          ? `Your account was suspended: ${data.notes ?? "community guidelines"}`
          : "Your account has been reinstated.",
      );
    }

    if (data.action === "warn") {
      await notify(
        row.reported_user_id ?? target?.ownerId ?? null,
        "moderation_warning",
        data.notes ?? "A moderator sent you a warning about community guidelines.",
      );
    }

    const nextStatus = data.action === "dismiss" ? "dismissed" : "action_taken";
    await db
      .from("reports")
      .update({
        status: nextStatus as never,
        resolution_note: data.notes ?? null,
        reviewed_by: context.userId,
        reviewed_at: new Date().toISOString(),
      })
      .eq("id", row.id);

    const logged = await db.from("moderation_actions").insert({
      report_id: row.id,
      moderator_id: context.userId,
      action: data.action as never,
      target_type: row.target_type,
      target_id: row.target_id,
      affected_user_id: row.reported_user_id,
      notes: data.notes ?? null,
    });
    if (logged.error) console.error("[moderation:log]", logged.error.message);

    return { ok: true, status: nextStatus };
  });

export const submitCopyrightComplaint = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => copyrightComplaintSchema.parse(input))
  .handler(async ({ data }) => {
    const db = await admin();
    const { error } = await db.from("copyright_complaints").insert({
      claimant_name: data.claimantName,
      claimant_email: data.claimantEmail,
      claimant_organisation: data.organisation ?? null,
      claimant_address: data.address ?? null,
      copyrighted_work: data.copyrightedWork,
      original_url: data.originalUrl ?? null,
      infringing_url: data.infringingUrl,
      infringing_description: data.infringingDescription ?? null,
      good_faith: data.goodFaith,
      accuracy_statement: data.accuracyStatement,
      signature: data.signature,
    });
    if (error) {
      console.error("[copyrightComplaint]", error.message);
      throw new Error("Could not file your complaint. Please try again.");
    }
    return { ok: true };
  });

export const listCopyrightComplaints = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await requireStaff(context.userId);
    const db = await admin();
    const res = await db
      .from("copyright_complaints")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(100);
    if (res.error) {
      console.error("[listCopyrightComplaints]", res.error.message);
      throw new Error("Could not load copyright complaints");
    }
    return res.data ?? [];
  });

export const setComplaintStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => complaintStatusSchema.parse(input))
  .handler(async ({ data, context }) => {
    await requireStaff(context.userId);
    const db = await admin();
    const { error } = await db
      .from("copyright_complaints")
      .update({
        status: data.status as never,
        resolution_note: data.notes ?? null,
        reviewed_by: context.userId,
        reviewed_at: new Date().toISOString(),
      })
      .eq("id", data.id);
    if (error) {
      console.error("[setComplaintStatus]", error.message);
      throw new Error("Could not update this complaint");
    }
    return { ok: true };
  });
