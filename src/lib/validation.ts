import { z } from "zod";
import { STATUSES } from "@/data/community";

const optionalUrl = z
  .string()
  .trim()
  .max(300)
  .refine((v) => v === "" || /^https?:\/\/\S+\.\S+/.test(v), {
    message: "Enter a full URL starting with http:// or https://",
  })
  .transform((v) => (v === "" ? null : v))
  .nullable()
  .optional();

export const projectInputSchema = z.object({
  id: z.string().uuid().optional(),
  title: z.string().trim().min(2, "Give your project a name").max(80),
  tagline: z.string().trim().min(4, "One short sentence, please").max(140),
  description: z.string().trim().min(10, "Tell us a little more").max(4000),
  category: z.string().trim().min(1).max(60).default("Web & Apps"),
  status: z.enum(STATUSES.map((s) => s.value) as unknown as [string, ...string[]]),
  demoUrl: optionalUrl,
  githubUrl: optionalUrl,
  thumbnailPath: z.string().trim().max(300).nullable().optional(),
  tech: z.array(z.string().trim().min(1).max(30)).max(12).default([]),
  published: z.boolean().default(true),
});

export type ProjectInput = z.infer<typeof projectInputSchema>;

export const profileInputSchema = z.object({
  username: z
    .string()
    .trim()
    .toLowerCase()
    .min(2, "At least 2 characters")
    .max(30)
    .regex(/^[a-z0-9_-]+$/, "Lowercase letters, numbers, - and _ only"),
  displayName: z.string().trim().min(1, "Add a display name").max(60),
  bio: z.string().trim().max(400).nullable().optional(),
  githubUrl: optionalUrl,
  portfolioUrl: optionalUrl,
  avatarPath: z.string().trim().max(300).nullable().optional(),
});

export const commentInputSchema = z.object({
  projectId: z.string().uuid(),
  body: z.string().trim().min(2, "Say a little more").max(1000),
  kind: z.enum(["feedback", "question", "celebration"]).default("feedback"),
});

export const avatarInputSchema = z.object({
  avatarPath: z.string().trim().max(300).nullable(),
});

export const DISCUSSION_CATEGORIES = [
  "General",
  "Help",
  "Show & Tell",
  "Ideas",
  "Resources",
  "Updates",
] as const;

export const discussionInputSchema = z.object({
  id: z.string().uuid().optional(),
  title: z.string().trim().min(4, "Give your discussion a title").max(120),
  body: z.string().trim().min(10, "Add a little more detail").max(4000),
  category: z
    .enum(DISCUSSION_CATEGORIES as unknown as [string, ...string[]])
    .default("General"),
  questId: z.string().uuid().nullable().optional(),
});

export const replyInputSchema = z.object({
  discussionId: z.string().uuid(),
  body: z.string().trim().min(2, "Say a little more").max(2000),
});

export const commentIdSchema = z.object({
  id: z.string().uuid(),
});

export const editCommentSchema = z.object({
  id: z.string().uuid(),
  body: z.string().trim().min(2, "Say a little more").max(1000),
});

export const editReplySchema = z.object({
  id: z.string().uuid(),
  body: z.string().trim().min(2, "Say a little more").max(2000),
});

export const markConversationReadSchema = z.object({
  conversationId: z.string().uuid(),
});

export const markNotificationsReadSchema = z.object({
  id: z.string().uuid().nullable().default(null),
});

export const credentialsSchema = z.object({
  email: z.string().trim().email("Enter a valid email").max(255),
  password: z.string().min(8, "Use at least 8 characters").max(72),
});

export const startConversationSchema = z.object({
  recipientId: z.string().uuid(),
  projectId: z.string().uuid().nullable().optional(),
});

export const sendMessageSchema = z
  .object({
    conversationId: z.string().uuid(),
    body: z.string().trim().max(4000).default(""),
    imagePath: z.string().trim().max(300).nullable().optional(),
  })
  .refine((v) => v.body.length > 0 || Boolean(v.imagePath), {
    message: "Write a message first",
    path: ["body"],
  });

export const respondRequestSchema = z.object({
  conversationId: z.string().uuid(),
  action: z.enum(["accept", "decline", "block"]),
});

export const blockUserSchema = z.object({
  userId: z.string().uuid(),
  action: z.enum(["block", "unblock"]),
});

export const reportConversationSchema = z.object({
  conversationId: z.string().uuid(),
  reason: z.string().trim().min(4, "Tell us what's wrong").max(500),
});

export function slugify(input: string) {
  return (
    input
      .toLowerCase()
      .normalize("NFKD")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 48) || "project"
  );
}

export const followSchema = z.object({
  userId: z.string().uuid(),
  action: z.enum(["follow", "unfollow"]),
});

export const pushSubscriptionSchema = z.object({
  endpoint: z.string().url().max(500),
  p256dh: z.string().min(1).max(500),
  auth: z.string().min(1).max(500),
});

export const removePushSubscriptionSchema = z.object({
  endpoint: z.string().url().max(500),
});

export const builderSearchSchema = z.object({
  term: z.string().trim().min(2, "Type at least 2 characters").max(40),
  projectId: z.string().uuid(),
});

export const inviteCollaboratorSchema = z.object({
  projectId: z.string().uuid(),
  userId: z.string().uuid(),
  canEdit: z.boolean().default(false),
});

export const respondCollaborationSchema = z.object({
  id: z.string().uuid(),
  action: z.enum(["accept", "decline"]),
});

export const updateCollaborationSchema = z.object({
  id: z.string().uuid(),
  canEdit: z.boolean(),
});

export const removeCollaborationSchema = z.object({ id: z.string().uuid() });

/* ---------- Reporting & moderation ---------- */

export const REPORT_TARGET_TYPES = [
  "project",
  "discussion",
  "discussion_reply",
  "comment",
  "profile",
] as const;

export const REPORT_REASON_VALUES = [
  "copied_project",
  "copyright",
  "impersonation",
  "spam",
  "harassment",
  "off_topic",
  "misleading",
  "other",
] as const;

export const REPORT_STATUS_VALUES = ["new", "reviewing", "action_taken", "dismissed"] as const;

export const reportInputSchema = z.object({
  targetType: z.enum(REPORT_TARGET_TYPES),
  targetId: z.string().uuid(),
  reason: z.enum(REPORT_REASON_VALUES),
  details: z
    .string()
    .trim()
    .max(2000)
    .transform((v) => (v === "" ? null : v))
    .nullable()
    .optional(),
});

export const reportStatusSchema = z.object({
  status: z.enum([...REPORT_STATUS_VALUES, "all"]).default("new"),
});

export const updateReportStatusSchema = z.object({
  id: z.string().uuid(),
  status: z.enum(REPORT_STATUS_VALUES),
});

export const moderationActionSchema = z.object({
  reportId: z.string().uuid(),
  action: z.enum([
    "dismiss",
    "warn",
    "hide_content",
    "unhide_content",
    "suspend_account",
    "unsuspend_account",
  ]),
  notes: z
    .string()
    .trim()
    .max(1000)
    .transform((v) => (v === "" ? null : v))
    .nullable()
    .optional(),
});

export const complaintStatusSchema = z.object({
  id: z.string().uuid(),
  status: z.enum(REPORT_STATUS_VALUES),
  notes: z
    .string()
    .trim()
    .max(1000)
    .transform((v) => (v === "" ? null : v))
    .nullable()
    .optional(),
});

const requiredUrl = z
  .string()
  .trim()
  .min(4, "Add the link to the content")
  .max(500)
  .refine((v) => /^https?:\/\/\S+\.\S+/.test(v) || v.startsWith("/"), {
    message: "Enter a full URL starting with http:// or https://",
  });

export const copyrightComplaintSchema = z.object({
  claimantName: z.string().trim().min(2, "Add your full legal name").max(120),
  claimantEmail: z.string().trim().email("Enter a valid email").max(255),
  organisation: z.string().trim().max(160).nullable().optional(),
  address: z.string().trim().max(400).nullable().optional(),
  copyrightedWork: z.string().trim().min(10, "Describe the work you own").max(2000),
  originalUrl: optionalUrl,
  infringingUrl: requiredUrl,
  infringingDescription: z.string().trim().max(2000).nullable().optional(),
  goodFaith: z.literal(true, { message: "Please confirm the good-faith statement" }),
  accuracyStatement: z.literal(true, { message: "Please confirm the accuracy statement" }),
  signature: z.string().trim().min(2, "Type your name as an electronic signature").max(120),
});
