import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Flag } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/use-auth";
import { submitReport } from "@/lib/moderation.functions";
import { REPORT_REASONS, TARGET_LABELS, type ReportReason, type ReportTarget } from "@/lib/moderation";

type Props = {
  targetType: ReportTarget;
  targetId: string | null | undefined;
  /** Owner of the content — the control hides itself for your own things. */
  ownerId?: string | null;
  variant?: "link" | "pill";
  label?: string;
};

/** Reusable "Report" control. Nothing is removed by reporting — a moderator reviews it. */
export function ReportButton({ targetType, targetId, ownerId, variant = "link", label }: Props) {
  const { userId, isAuthenticated } = useAuth();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState<ReportReason>("spam");
  const [details, setDetails] = useState("");
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const run = useServerFn(submitReport);

  const send = useMutation({
    mutationFn: () =>
      run({ data: { targetType, targetId: targetId!, reason, details: details.trim() } as never }),
    onSuccess: () => {
      setDone(true);
      setError(null);
      setDetails("");
      toast.success("Report sent — our moderators will review it");
    },
    onError: (e) => {
      const message = e instanceof Error ? e.message : "Could not send your report";
      setError(message);
      toast.error(message);
    },
  });

  if (!targetId) return null;
  if (userId && ownerId && userId === ownerId) return null;

  const trigger =
    variant === "pill" ? (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex min-h-11 items-center gap-2 rounded-full border border-border px-4 text-[13px] transition-colors duration-200 hover:border-neon"
      >
        <Flag className="size-3.5" /> {label ?? "Report"}
      </button>
    ) : (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="font-mono text-[11px] text-muted-foreground transition-colors duration-200 hover:text-neon"
      >
        {label ?? "Report"}
      </button>
    );

  return (
    <>
      {trigger}
      {open ? (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-background/70 p-4 backdrop-blur-sm sm:items-center"
          role="dialog"
          aria-modal="true"
          aria-label={`Report this ${TARGET_LABELS[targetType]?.toLowerCase() ?? "content"}`}
          onClick={(e) => {
            if (e.target === e.currentTarget) setOpen(false);
          }}
        >
          <div className="surface-card w-full max-w-lg p-5 sm:p-6">
            <h2 className="text-[15px] font-semibold tracking-tight">
              Report this {TARGET_LABELS[targetType]?.toLowerCase() ?? "content"}
            </h2>

            {!isAuthenticated ? (
              <>
                <p className="mt-3 text-[13px] text-muted-foreground">
                  <Link to="/auth" className="underline underline-offset-4 hover:text-neon">
                    Sign in
                  </Link>{" "}
                  to send a report. We only show reports to our moderation team.
                </p>
                <div className="mt-5 flex justify-end">
                  <button
                    type="button"
                    onClick={() => setOpen(false)}
                    className="min-h-11 rounded-full border border-border px-5 text-[13px]"
                  >
                    Close
                  </button>
                </div>
              </>
            ) : done ? (
              <>
                <p className="mt-3 text-[13px] text-muted-foreground">
                  Thanks — your report is with our moderators. Nothing is removed automatically;
                  a person reviews every report.
                </p>
                <div className="mt-5 flex justify-end">
                  <button
                    type="button"
                    onClick={() => {
                      setOpen(false);
                      setDone(false);
                    }}
                    className="min-h-11 rounded-full bg-foreground px-5 text-[13px] font-medium text-background"
                  >
                    Done
                  </button>
                </div>
              </>
            ) : (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  send.mutate();
                }}
                className="mt-4"
              >
                <label className="block font-mono text-[11px] text-muted-foreground" htmlFor="report-reason">
                  Reason
                </label>
                <select
                  id="report-reason"
                  value={reason}
                  onChange={(e) => setReason(e.target.value as ReportReason)}
                  className="mt-1.5 w-full rounded-lg border border-border bg-background px-3.5 py-3 text-[14px] outline-none focus:border-neon"
                >
                  {REPORT_REASONS.map((r) => (
                    <option key={r.value} value={r.value}>
                      {r.label}
                    </option>
                  ))}
                </select>

                <label className="mt-4 block font-mono text-[11px] text-muted-foreground" htmlFor="report-details">
                  Description or evidence (optional)
                </label>
                <textarea
                  id="report-details"
                  value={details}
                  onChange={(e) => setDetails(e.target.value)}
                  rows={4}
                  maxLength={2000}
                  placeholder="Links, dates, anything that helps us check this quickly."
                  className="mt-1.5 w-full rounded-lg border border-border bg-background px-3.5 py-3 text-[14px] outline-none focus:border-neon"
                />

                {error ? <p className="mt-3 text-[12px] text-red-500">{error}</p> : null}

                <div className="mt-5 flex flex-wrap justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setOpen(false)}
                    className="min-h-11 rounded-full border border-border px-5 text-[13px]"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={send.isPending}
                    className="min-h-11 rounded-full bg-foreground px-5 text-[13px] font-medium text-background disabled:opacity-60"
                  >
                    {send.isPending ? "Sending…" : "Send report"}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      ) : null}
    </>
  );
}
