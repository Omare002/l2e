import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { submitCopyrightComplaint } from "@/lib/moderation.functions";

export const Route = createFileRoute("/copyright-complaint")({
  head: () => ({
    meta: [
      { title: "File a copyright complaint — Leaderboard" },
      {
        name: "description",
        content:
          "Rights holders can formally report infringing content on Leaderboard with the work, infringing link, contact details and sworn statements.",
      },
      { property: "og:title", content: "File a copyright complaint — Leaderboard" },
      {
        property: "og:description",
        content: "Formally report infringing content to the Leaderboard moderation team.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ComplaintForm,
});

const EMPTY = {
  claimantName: "",
  claimantEmail: "",
  organisation: "",
  address: "",
  copyrightedWork: "",
  originalUrl: "",
  infringingUrl: "",
  infringingDescription: "",
  signature: "",
};

function ComplaintForm() {
  const [form, setForm] = useState(EMPTY);
  const [goodFaith, setGoodFaith] = useState(false);
  const [accuracy, setAccuracy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const run = useServerFn(submitCopyrightComplaint);

  const send = useMutation({
    mutationFn: () =>
      run({
        data: {
          ...form,
          organisation: form.organisation.trim() || null,
          address: form.address.trim() || null,
          infringingDescription: form.infringingDescription.trim() || null,
          goodFaith,
          accuracyStatement: accuracy,
        } as never,
      }),
    onSuccess: () => {
      setSent(true);
      setError(null);
      setForm(EMPTY);
      setGoodFaith(false);
      setAccuracy(false);
    },
    onError: (e) =>
      setError(e instanceof Error ? e.message : "Could not file your complaint. Please try again."),
  });

  function field(key: keyof typeof EMPTY) {
    return {
      value: form[key],
      onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
        setForm((f) => ({ ...f, [key]: e.target.value })),
    };
  }

  if (sent) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-20 sm:px-6">
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Complaint received</h1>
        <p className="mt-4 text-[14px] leading-relaxed text-muted-foreground">
          Thank you. Our moderation team will review your claim and contact you at the email address
          you gave. Content is not removed automatically — a person reviews every complaint.
        </p>
        <Link to="/copyright" className="mt-6 inline-block text-[13px] underline underline-offset-4">
          Read the copyright policy
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-14 sm:px-6 sm:py-16">
      <span className="rounded-full bg-neon-dim px-2.5 py-1 font-mono text-[10px]">Legal</span>
      <h1 className="mt-4 text-3xl font-semibold tracking-tight sm:text-4xl">
        File a copyright complaint
      </h1>
      <p className="mt-4 text-[14px] leading-relaxed text-muted-foreground">
        Use this form if you own the rights to work published here without permission. For anything
        else — copied ideas, spam, harassment — use the <strong className="text-foreground">Report</strong>{" "}
        action on the content itself. See the{" "}
        <Link to="/copyright" className="underline underline-offset-4 hover:text-neon">
          copyright policy
        </Link>
        .
      </p>

      <form
        className="mt-9 grid gap-5"
        onSubmit={(e) => {
          e.preventDefault();
          send.mutate();
        }}
      >
        <Field label="Your full legal name" required>
          <input {...field("claimantName")} maxLength={120} className={inputClass} required />
        </Field>
        <Field label="Email we can reply to" required>
          <input {...field("claimantEmail")} type="email" maxLength={255} className={inputClass} required />
        </Field>
        <Field label="Company or organisation (optional)">
          <input {...field("organisation")} maxLength={160} className={inputClass} />
        </Field>
        <Field label="Postal address (optional)">
          <input {...field("address")} maxLength={400} className={inputClass} />
        </Field>
        <Field label="Describe the work you own" required>
          <textarea {...field("copyrightedWork")} rows={4} maxLength={2000} className={inputClass} required />
        </Field>
        <Field label="Where your original work lives (optional)">
          <input {...field("originalUrl")} placeholder="https://" maxLength={300} className={inputClass} />
        </Field>
        <Field label="Link to the infringing content on Leaderboard" required>
          <input {...field("infringingUrl")} placeholder="https://" maxLength={300} className={inputClass} required />
        </Field>
        <Field label="What exactly is infringing? (optional)">
          <textarea {...field("infringingDescription")} rows={3} maxLength={2000} className={inputClass} />
        </Field>

        <label className="flex gap-3 text-[13px] leading-relaxed text-muted-foreground">
          <input
            type="checkbox"
            checked={goodFaith}
            onChange={(e) => setGoodFaith(e.target.checked)}
            className="mt-0.5 size-4 shrink-0 accent-neon"
          />
          I have a good-faith belief that the use of the material described above is not authorised by
          the copyright owner, its agent, or the law.
        </label>
        <label className="flex gap-3 text-[13px] leading-relaxed text-muted-foreground">
          <input
            type="checkbox"
            checked={accuracy}
            onChange={(e) => setAccuracy(e.target.checked)}
            className="mt-0.5 size-4 shrink-0 accent-neon"
          />
          The information in this complaint is accurate, and I am the copyright owner or authorised to
          act on the owner's behalf.
        </label>

        <Field label="Electronic signature — type your full name" required>
          <input {...field("signature")} maxLength={120} className={inputClass} required />
        </Field>

        {error ? <p className="text-[13px] text-red-500">{error}</p> : null}

        <button
          type="submit"
          disabled={send.isPending}
          className="min-h-12 rounded-full bg-foreground px-6 text-[14px] font-medium text-background transition-colors duration-200 hover:bg-foreground/90 disabled:opacity-60"
        >
          {send.isPending ? "Filing…" : "File complaint"}
        </button>
      </form>
    </div>
  );
}

const inputClass =
  "mt-1.5 w-full rounded-lg border border-border bg-background px-3.5 py-3 text-[14px] outline-none focus:border-neon";

function Field({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="font-mono text-[11px] text-muted-foreground">
        {label}
        {required ? " *" : ""}
      </span>
      {children}
    </label>
  );
}
