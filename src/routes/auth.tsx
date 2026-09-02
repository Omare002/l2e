import { useEffect, useState } from "react";
import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { useAuth } from "@/hooks/use-auth";
import { credentialsSchema } from "@/lib/validation";
import { setRememberMe } from "@/lib/session";
import { friendlyAuthError } from "@/lib/auth-errors";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Sign in — Leaderboard" },
      {
        name: "description",
        content:
          "Sign in to submit projects, upvote community builds and track your position in the weekly LearnToEarn race.",
      },
      { property: "og:title", content: "Sign in — Leaderboard" },
      {
        property: "og:description",
        content: "Sign in to submit projects, upvote builds and climb the weekly race.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AuthPage,
});

const FIELD =
  "mt-2 w-full rounded-lg border border-border bg-background px-3.5 py-3 text-[14px] text-foreground outline-none transition-colors duration-200 focus:border-neon";

type Mode = "signin" | "signup" | "forgot";

function AuthPage() {
  const [mode, setMode] = useState<Mode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(true);
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState<"confirm" | "reset" | null>(null);
  const { isAuthenticated, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && isAuthenticated) router.navigate({ to: "/dashboard", replace: true });
  }, [isAuthenticated, loading, router]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      if (mode === "forgot") {
        const parsed = credentialsSchema.shape.email.safeParse(email);
        if (!parsed.success) throw new Error(parsed.error.issues[0]?.message ?? "Invalid email");
        const { error } = await supabase.auth.resetPasswordForEmail(parsed.data, {
          redirectTo: `${window.location.origin}/reset-password`,
        });
        if (error) throw error;
        setSent("reset");
        return;
      }

      const parsed = credentialsSchema.safeParse({ email, password });
      if (!parsed.success) throw new Error(parsed.error.issues[0]?.message ?? "Check your details");
      setRememberMe(remember);

      if (mode === "signup") {
        const { data, error } = await supabase.auth.signUp({
          email: parsed.data.email,
          password: parsed.data.password,
          options: { emailRedirectTo: window.location.origin },
        });
        if (error) throw error;
        if (!data.session) {
          setSent("confirm");
          return;
        }
        toast.success("Welcome to the race");
        return;
      }

      const { error } = await supabase.auth.signInWithPassword({
        email: parsed.data.email,
        password: parsed.data.password,
      });
      if (error) throw error;
      toast.success("Signed in");
    } catch (error) {
      toast.error(friendlyAuthError(error));
    } finally {
      setBusy(false);
    }
  }

  async function google() {
    setRememberMe(remember);
    const result = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: window.location.origin,
    });
    if (result?.error) toast.error(friendlyAuthError(result.error, "Google sign-in failed."));
  }

  if (sent) {
    return (
      <div className="mx-auto max-w-md px-4 py-24 text-center sm:px-6">
        <h1 className="text-2xl font-semibold tracking-tight">Check your inbox</h1>
        <p className="mt-4 text-[14px] leading-relaxed text-muted-foreground">
          {sent === "confirm"
            ? `We sent a confirmation link to ${email}. Click it to activate your account and start racing.`
            : `We sent a password reset link to ${email}.`}
        </p>
        <button
          type="button"
          onClick={() => {
            setSent(null);
            setMode("signin");
          }}
          className="mt-8 min-h-11 rounded-full border border-border px-5 text-[13px] transition-colors duration-200 hover:border-neon"
        >
          Back to sign in
        </button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-md px-4 py-16 sm:px-6 sm:py-24">
      <h1 className="text-3xl font-semibold tracking-tight">
        {mode === "signup" ? "Create your account" : mode === "forgot" ? "Reset password" : "Welcome back"}
      </h1>
      <p className="mt-3 text-[14px] leading-relaxed text-muted-foreground">
        {mode === "forgot"
          ? "We'll email you a link to choose a new password."
          : "Sign in to submit projects, upvote builds and climb the weekly race."}
      </p>

      {mode !== "forgot" ? (
        <>
          <button
            type="button"
            onClick={google}
            className="mt-8 flex min-h-12 w-full items-center justify-center gap-3 rounded-full border border-border text-[14px] font-medium transition-colors duration-200 hover:border-neon hover:bg-muted/50"
          >
            Continue with Google
          </button>
          <div className="my-7 flex items-center gap-4 text-[11px] text-muted-foreground">
            <span className="h-px flex-1 bg-border" /> or email <span className="h-px flex-1 bg-border" />
          </div>
        </>
      ) : null}

      <form onSubmit={submit} className={mode === "forgot" ? "mt-8" : ""}>
        <label className="block text-[12px] text-muted-foreground">
          Email
          <input
            type="email"
            autoComplete="email"
            inputMode="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={FIELD}
            required
          />
        </label>

        {mode !== "forgot" ? (
          <label className="mt-5 block text-[12px] text-muted-foreground">
            Password
            <input
              type="password"
              autoComplete={mode === "signup" ? "new-password" : "current-password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={FIELD}
              required
            />
          </label>
        ) : null}

        {mode !== "forgot" ? (
          <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
            <label className="flex min-h-11 items-center gap-2.5 text-[13px] text-muted-foreground">
              <input
                type="checkbox"
                checked={remember}
                onChange={(e) => setRemember(e.target.checked)}
                className="size-4 accent-[var(--neon)]"
              />
              Remember me
            </label>
            <button
              type="button"
              onClick={() => setMode("forgot")}
              className="min-h-11 text-[13px] text-muted-foreground transition-colors duration-200 hover:text-neon"
            >
              Forgot password?
            </button>
          </div>
        ) : null}

        <button
          type="submit"
          disabled={busy}
          className="mt-7 min-h-12 w-full rounded-full bg-foreground text-[14px] font-medium text-background transition-colors duration-200 hover:bg-foreground/90 disabled:opacity-60"
        >
          {busy
            ? "Working…"
            : mode === "signup"
              ? "Create account"
              : mode === "forgot"
                ? "Send reset link"
                : "Sign in"}
        </button>
      </form>

      <div className="mt-8 text-[13px] text-muted-foreground">
        {mode === "signin" ? (
          <button
            type="button"
            onClick={() => setMode("signup")}
            className="transition-colors duration-200 hover:text-neon"
          >
            New here? Create an account
          </button>
        ) : (
          <button
            type="button"
            onClick={() => setMode("signin")}
            className="transition-colors duration-200 hover:text-neon"
          >
            Already have an account? Sign in
          </button>
        )}
      </div>

      <p className="mt-10 text-[12px] leading-relaxed text-muted-foreground">
        You can browse projects and the leaderboard without an account —{" "}
        <Link to="/projects" className="underline underline-offset-4 hover:text-neon">
          keep exploring
        </Link>
        .
      </p>
    </div>
  );
}
