import { queryOptions } from "@tanstack/react-query";
import {
  listCopyrightComplaints,
  listReports,
  myModerationAccess,
  myReports,
} from "@/lib/moderation.functions";

export const REPORT_TARGETS = ["project", "discussion", "discussion_reply", "comment", "profile"] as const;
export type ReportTarget = (typeof REPORT_TARGETS)[number];

export const REPORT_REASONS = [
  { value: "copied_project", label: "Copied / stolen project" },
  { value: "copyright", label: "Copyright infringement" },
  { value: "impersonation", label: "Impersonation" },
  { value: "spam", label: "Spam" },
  { value: "harassment", label: "Harassment" },
  { value: "off_topic", label: "Off-topic" },
  { value: "misleading", label: "Misleading content" },
  { value: "other", label: "Other" },
] as const;

export type ReportReason = (typeof REPORT_REASONS)[number]["value"];

export function reasonLabel(reason: string) {
  return REPORT_REASONS.find((r) => r.value === reason)?.label ?? reason;
}

export const REPORT_STATUSES = [
  { value: "new", label: "New" },
  { value: "reviewing", label: "Reviewing" },
  { value: "action_taken", label: "Action taken" },
  { value: "dismissed", label: "Dismissed" },
] as const;

export type ReportStatus = (typeof REPORT_STATUSES)[number]["value"];

export function statusLabel(status: string) {
  return REPORT_STATUSES.find((s) => s.value === status)?.label ?? status;
}

export const TARGET_LABELS: Record<string, string> = {
  project: "Project",
  discussion: "Forum post",
  discussion_reply: "Forum reply",
  comment: "Comment",
  profile: "Profile",
};

export const moderationKeys = {
  access: ["moderation-access"] as const,
  reports: (status: string) => ["moderation-reports", status] as const,
  complaints: ["moderation-complaints"] as const,
  mine: ["my-reports"] as const,
};

export function moderationAccessQuery(enabled: boolean) {
  return queryOptions({
    queryKey: moderationKeys.access,
    enabled,
    queryFn: () => myModerationAccess(),
    staleTime: 60_000,
  });
}

export function moderationReportsQuery(status: string, enabled: boolean) {
  return queryOptions({
    queryKey: moderationKeys.reports(status),
    enabled,
    queryFn: () => listReports({ data: { status } }),
  });
}

export function copyrightComplaintsQuery(enabled: boolean) {
  return queryOptions({
    queryKey: moderationKeys.complaints,
    enabled,
    queryFn: () => listCopyrightComplaints(),
  });
}

export function myReportsQuery(enabled: boolean) {
  return queryOptions({
    queryKey: moderationKeys.mine,
    enabled,
    queryFn: () => myReports(),
  });
}
