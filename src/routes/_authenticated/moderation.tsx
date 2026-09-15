import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { LoadFailure, SkeletonLines } from "@/components/skeleton-block";
import { useAuth } from "@/hooks/use-auth";
import { relativeTime } from "@/lib/display";
import {
  copyrightComplaintsQuery,
  moderationAccessQuery,
  moderationReportsQuery,
  reasonLabel,
  statusLabel,
  TARGET_LABELS,
} from "@/lib/moderation";
import {
  applyModerationAction,
  setComplaintStatus,
  setReportStatus,
  type ModerationReport,
} from "@/lib/moderation.functions";

export const Route = createFileRoute("/_authenticated/moderation")({
  head: () => ({
    meta: [
      { title: "Moderation queue — Leaderboard" },
      { name: "description", content: "Review reported projects, posts and accounts, and act on copyright complaints." },
      { property: "og:title", content: "Moderation queue — Leaderboard" },
      { property: "og:description", content: "Review reported content and copyright complaints." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ModerationPage,
});

const TABS = [
  { value: "new", label: "New" },
  { value: "reviewing", label: "Reviewing" },
  { value: "action_taken", label: "Action taken" },
  { value: "dismissed", label: "Dismissed" },
  { value: "all", label: "All" },
] as const;

function ModerationPage() {
  const { isAuthenticated } = useAuth();
  const access = useQuery(moderationAccessQuery(isAuthenticated));
  const [tab, setTab] = useState<string>("new");
  const isStaff = access.data?.isStaff ?? false;
  const reports = useQuery(moderationReportsQuery(tab, isStaff));
  const complaints = useQuery(copyrightComplaintsQuery(isStaff));

  if (access.isLoading) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-14 sm:px-6">
        <SkeletonLines rows={5} />
      </div>
    );
  }

  if (!isStaff) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-20 sm:px-6">
        <h1 className="text-2xl font-semibold tracking-tight">Moderators only</h1>
        <p className="mt-3 text-[14px] text-muted-foreground">
          This area is for the community moderation team. If you reported something, we'll review it
          and you'll hear back through your notifications.
        </p>
        <Link to="/" className="mt-6 inline-block text-[13px] underline underline-offset-4">
          Back to home
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-14 sm:px-6 sm:py-16">
      <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Moderation queue</h1>
      <p className="mt-3 max-w-2xl text-[14px] text-muted-foreground">
        Reported content stays visible until a moderator decides. Hiding is reversible and nothing is
        deleted automatically.
      </p>

      <div className="mt-7 flex flex-wrap gap-2">
        {TABS.map((t) => (
          <button
            key={t.value}
            type="button"
            onClick={() => setTab(t.value)}
            className={`min-h-10 rounded-full border px-4 font-mono text-[11px] transition-colors duration-200 ${
              tab === t.value ? "border-neon bg-neon/10 text-neon" : "border-border hover:border-neon"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <section className="mt-6">
        {reports.isLoading ? (
          <SkeletonLines rows={5} />
        ) : reports.isError ? (
          <LoadFailure message="The queue couldn't load just now." onRetry={() => reports.refetch()} />
        ) : (reports.data ?? []).length === 0 ? (
          <p className="rounded-lg border border-border px-4 py-10 text-center text-[13px] text-muted-foreground">
            Nothing here — the queue is clear.
          </p>
        ) : (
          <ul className="grid gap-4">
            {(reports.data ?? []).map((report) => (
              <ReportCard key={report.id} report={report} />
            ))}
          </ul>
        )}
      </section>

      <section className="mt-14">
        <h2 className="text-lg font-semibold tracking-tight">Copyright complaints</h2>
        {complaints.isLoading ? (
          <div className="mt-4">
            <SkeletonLines rows={3} />
          </div>
        ) : complaints.isError ? (
          <div className="mt-4">
            <LoadFailure
              message="Complaints couldn't load just now."
              onRetry={() => complaints.refetch()}
            />
          </div>
        ) : (complaints.data ?? []).length === 0 ? (
          <p className="mt-4 rounded-lg border border-border px-4 py-10 text-center text-[13px] text-muted-foreground">
            No formal complaints filed.
          </p>
        ) : (
          <ul className="mt-4 grid gap-4">
            {(complaints.data ?? []).map((c) => (
              <ComplaintCard key={c.id} complaint={c} />
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function StatusPill({ status }: { status: string }) {
  const tone =
    status === "new"
      ? "border-neon text-neon"
      : status === "reviewing"
        ? "border-border text-foreground"
        : "border-border text-muted-foreground";
  return (
    <span className={`rounded-full border px-2.5 py-1 font-mono text-[10px] ${tone}`}>
      {statusLabel(status)}
    </span>
  );
}

function ReportCard({ report }: { report: ModerationReport }) {
  const queryClient = useQueryClient();
  const [notes, setNotes] = useState("");
  const runAction = useServerFn(applyModerationAction);
  const runStatus = useServerFn(setReportStatus);

  function refresh() {
    queryClient.invalidateQueries({ queryKey: ["moderation-reports"] });
  }

  const act = useMutation({
    mutationFn: (action: string) =>
      runAction({ data: { reportId: report.id, action, notes: notes.trim() } as never }),
    onSuccess: () => {
      setNotes("");
      refresh();
      toast.success("Decision recorded");
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Could not record that decision"),
  });

  const review = useMutation({
    mutationFn: () => runStatus({ data: { id: report.id, status: "reviewing" } as never }),
    onSuccess: () => {
      refresh();
      toast.success("Marked as reviewing");
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Could not update this report"),
  });

  const canHide = report.target_type !== "profile";

  return (
    <li className="surface-card p-4 sm:p-5">
      <div className="flex flex-wrap items-center gap-2.5">
        <span className="rounded-full bg-neon-dim px-2.5 py-1 font-mono text-[10px]">
          {TARGET_LABELS[report.target_type] ?? report.target_type}
        </span>
        <StatusPill status={report.status} />
        <span className="font-mono text-[11px] text-muted-foreground">
          {reasonLabel(report.reason)} · {relativeTime(report.created_at)}
        </span>
        {report.duplicate_count > 1 ? (
          <span className="font-mono text-[11px] text-neon">
            {report.duplicate_count} reports on this item
          </span>
        ) : null}
      </div>

      <h3 className="mt-3 text-[15px] font-medium">{report.target?.title ?? "Content removed by author"}</h3>
      {report.target?.excerpt ? (
        <p className="mt-2 line-clamp-4 whitespace-pre-line text-[13px] leading-relaxed text-muted-foreground">
          {report.target.excerpt}
        </p>
      ) : null}

      <dl className="mt-3 grid gap-1 font-mono text-[11px] text-muted-foreground">
        <div>
          Reported by @{report.reporter?.username ?? "unknown"} · author @
          {report.reported_user?.username ?? "unknown"}
          {report.reported_user?.suspended ? " (suspended)" : ""}
          {report.target?.hidden ? " · content hidden" : ""}
        </div>
        {report.details ? <div className="text-foreground">“{report.details}”</div> : null}
        {report.resolution_note ? <div>Note: {report.resolution_note}</div> : null}
      </dl>

      <div className="mt-3 flex flex-wrap gap-3">
        {report.target?.link ? (
          <a
            href={report.target.link}
            target="_blank"
            rel="noreferrer noopener"
            className="font-mono text-[11px] underline underline-offset-4 hover:text-neon"
          >
            Open content
          </a>
        ) : null}
        {report.status === "new" ? (
          <button
            type="button"
            onClick={() => review.mutate()}
            disabled={review.isPending}
            className="font-mono text-[11px] underline underline-offset-4 hover:text-neon disabled:opacity-60"
          >
            Start reviewing
          </button>
        ) : null}
      </div>

      <textarea
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        rows={2}
        maxLength={1000}
        placeholder="Internal note / message sent with a warning or suspension"
        className="mt-4 w-full rounded-lg border border-border bg-background px-3.5 py-2.5 text-[13px] outline-none focus:border-neon"
      />

      <div className="mt-3 flex flex-wrap gap-2">
        <ActionButton onClick={() => act.mutate("dismiss")} disabled={act.isPending}>
          Dismiss
        </ActionButton>
        <ActionButton onClick={() => act.mutate("warn")} disabled={act.isPending}>
          Warn author
        </ActionButton>
        {canHide ? (
          report.target?.hidden ? (
            <ActionButton onClick={() => act.mutate("unhide_content")} disabled={act.isPending}>
              Restore content
            </ActionButton>
          ) : (
            <ActionButton onClick={() => act.mutate("hide_content")} disabled={act.isPending}>
              Hide content
            </ActionButton>
          )
        ) : null}
        {report.reported_user?.suspended ? (
          <ActionButton onClick={() => act.mutate("unsuspend_account")} disabled={act.isPending}>
            Reinstate account
          </ActionButton>
        ) : (
          <ActionButton
            onClick={() => {
              if (
                window.confirm(
                  "Suspend this account? They will not be able to post, submit or vote until reinstated.",
                )
              ) {
                act.mutate("suspend_account");
              }
            }}
            disabled={act.isPending}
          >
            Suspend account
          </ActionButton>
        )}
      </div>
    </li>
  );
}

function ActionButton({
  children,
  onClick,
  disabled,
}: {
  children: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="min-h-10 rounded-full border border-border px-4 text-[12px] transition-colors duration-200 hover:border-neon disabled:opacity-60"
    >
      {children}
    </button>
  );
}

type Complaint = {
  id: string;
  claimant_name: string;
  claimant_email: string;
  copyrighted_work: string;
  infringing_url: string;
  infringing_description: string | null;
  signature: string;
  status: string;
  created_at: string;
  resolution_note: string | null;
};

function ComplaintCard({ complaint }: { complaint: Complaint }) {
  const queryClient = useQueryClient();
  const [notes, setNotes] = useState("");
  const run = useServerFn(setComplaintStatus);

  const update = useMutation({
    mutationFn: (status: string) =>
      run({ data: { id: complaint.id, status, notes: notes.trim() } as never }),
    onSuccess: () => {
      setNotes("");
      queryClient.invalidateQueries({ queryKey: ["moderation-complaints"] });
      toast.success("Complaint updated");
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Could not update this complaint"),
  });

  return (
    <li className="surface-card p-4 sm:p-5">
      <div className="flex flex-wrap items-center gap-2.5">
        <StatusPill status={complaint.status} />
        <span className="font-mono text-[11px] text-muted-foreground">
          {relativeTime(complaint.created_at)}
        </span>
      </div>
      <h3 className="mt-3 text-[15px] font-medium">{complaint.claimant_name}</h3>
      <p className="font-mono text-[11px] text-muted-foreground">{complaint.claimant_email}</p>
      <p className="mt-3 whitespace-pre-line text-[13px] leading-relaxed text-muted-foreground">
        <strong className="text-foreground">Work:</strong> {complaint.copyrighted_work}
      </p>
      <p className="mt-2 break-words text-[13px] text-muted-foreground">
        <strong className="text-foreground">Infringing:</strong> {complaint.infringing_url}
      </p>
      {complaint.infringing_description ? (
        <p className="mt-2 whitespace-pre-line text-[13px] text-muted-foreground">
          {complaint.infringing_description}
        </p>
      ) : null}
      <p className="mt-2 font-mono text-[11px] text-muted-foreground">
        Signed: {complaint.signature}
      </p>
      {complaint.resolution_note ? (
        <p className="mt-2 font-mono text-[11px] text-muted-foreground">
          Note: {complaint.resolution_note}
        </p>
      ) : null}

      <textarea
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        rows={2}
        maxLength={1000}
        placeholder="Resolution note"
        className="mt-4 w-full rounded-lg border border-border bg-background px-3.5 py-2.5 text-[13px] outline-none focus:border-neon"
      />
      <div className="mt-3 flex flex-wrap gap-2">
        <ActionButton onClick={() => update.mutate("reviewing")} disabled={update.isPending}>
          Reviewing
        </ActionButton>
        <ActionButton onClick={() => update.mutate("action_taken")} disabled={update.isPending}>
          Action taken
        </ActionButton>
        <ActionButton onClick={() => update.mutate("dismissed")} disabled={update.isPending}>
          Dismiss
        </ActionButton>
      </div>
    </li>
  );
}
