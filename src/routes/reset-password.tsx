import { useState } from "react";
import { createFileRoute, useRouter } from "@tanstack/react-router";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/reset-password")({
  head: () => ({
    meta: [
      { title: "Choose a new password — Leaderboard" },
      { name: "description", content: "Set a new password for your Leaderboard account." },
      { property: "og:title", content: "Choose a new password — Leaderboard" },
      { property: "og:description", content: "Set a new password for your Leaderboard account." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: ResetPassword,
});

function ResetPassword() {
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const router = useRouter();

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (password.length < 8) {
      toast.error("Use at least 8 characters");
      return;
    }
    setBusy(true);
    const { error } = await supabase.auth.updateUser({ password });
    setBusy(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Password updated");
    router.navigate({ to: "/dashboard", replace: true });
  }

  return (
    <div className="mx-auto max-w-md px-4 py-16 sm:px-6 sm:py-24">
      <h1 className="text-3xl font-semibold tracking-tight">Choose a new password</h1>
      <p className="mt-3 text-[14px] leading-relaxed text-muted-foreground">
        Open this page from the reset link in your email, then set a new password.
      </p>
      <form onSubmit={submit} className="mt-8">
        <label className="block text-[12px] text-muted-foreground">
          New password
          <input
            type="password"
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="mt-2 w-full rounded-lg border border-border bg-background px-3.5 py-3 text-[14px] outline-none transition-colors duration-200 focus:border-neon"
            required
          />
        </label>
        <button
          type="submit"
          disabled={busy}
          className="mt-7 min-h-12 w-full rounded-full bg-foreground text-[14px] font-medium text-background transition-colors duration-200 hover:bg-foreground/90 disabled:opacity-60"
        >
          {busy ? "Saving…" : "Update password"}
        </button>
      </form>
    </div>
  );
}
