import { useEffect, useState } from "react";
import { CollaborationInvites } from "@/components/projects/collaboration-invites";
import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { AchievementTiles } from "@/components/achievement-tiles";
import { AvatarPicker } from "@/components/avatar-picker";
import { UserAvatar } from "@/components/user-avatar";
import { earnedAchievements } from "@/data/community";
import { deleteProject, saveProfile } from "@/lib/app.functions";
import {
  commentsWrittenQuery,
  leaderboardQuery,
  myProfileQuery,
  myProjectsQuery,
  rankHistoryQuery,
  userActivityQuery,
} from "@/lib/db";
import { profileInputSchema } from "@/lib/validation";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { ACTIVITY_LABELS, relativeTime } from "@/lib/display";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [
      { title: "Your dashboard — Leaderboard" },
      {
        name: "description",
        content: "Manage your projects, track upvotes and feedback, and watch your race position.",
      },
      { property: "og:title", content: "Your dashboard — Leaderboard" },
      {
        property: "og:description",
        content: "Manage your projects, track upvotes and feedback, and watch your race position.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: Dashboard,
});

const CARD = "rounded-xl border border-border bg-background/60";
const FIELD =
  "mt-2 w-full rounded-lg border border-border bg-background px-3.5 py-3 text-[14px] outline-none transition-colors duration-200 focus:border-neon";

function RankSparkline({ points }: { points: number[] }) {
  if (points.length < 2) return <div className="h-16" />;
  const max = Math.max(...points);
  const min = Math.min(...points);
  const span = Math.max(1, max - min);
  const path = points
    .map((p, i) => {
      const x = (i / (points.length - 1)) * 100;
      const y = ((p - min) / span) * 26 + 2;
      return `${i === 0 ? "M" : "L"}${x.toFixed(2)},${y.toFixed(2)}`;
    })
    .join(" ");
  return (
    <svg viewBox="0 0 100 30" preserveAspectRatio="none" className="h-16 w-full" aria-hidden>
      <path d={path} fill="none" stroke="var(--neon)" strokeWidth="1.2" vectorEffect="non-scaling-stroke" />
    </svg>
  );
}

function Dashboard() {
  const { userId, user } = useAuth();
  const router = useRouter();
  const queryClient = useQueryClient();
  const id = userId ?? "";

  const { data: profile } = useQuery({ ...myProfileQuery(id), enabled: Boolean(id) });
  const { data: projects } = useQuery({ ...myProjectsQuery(id), enabled: Boolean(id) });
  const { data: leaders } = useQuery(leaderboardQuery());
  const { data: written } = useQuery({ ...commentsWrittenQuery(id), enabled: Boolean(id) });
  const { data: trend } = useQuery({ ...rankHistoryQuery(id), enabled: Boolean(id) });
  const { data: activity } = useQuery({
    ...userActivityQuery(profile?.username ?? ""),
    enabled: Boolean(profile?.username),
  });

  const runSaveProfile = useServerFn(saveProfile);
  const runDelete = useServerFn(deleteProject);

  const [form, setForm] = useState({
    username: "",
    displayName: "",
    bio: "",
    githubUrl: "",
    portfolioUrl: "",
    avatarPath: null as string | null,
  });

  useEffect(() => {
    if (!profile) return;
    setForm({
      username: profile.username,
      displayName: profile.display_name,
      bio: profile.bio ?? "",
      githubUrl: profile.github_url ?? "",
      portfolioUrl: profile.portfolio_url ?? "",
      avatarPath: profile.avatar_url ?? null,
    });
  }, [profile?.id, profile?.updated_at]);

  const row = (leaders ?? []).find((l) => l.id === userId);
  const mine = projects ?? [];
  const votes = mine.reduce((n, p) => n + (p.vote_count ?? 0), 0);
  const comments = mine.reduce((n, p) => n + (p.comment_count ?? 0), 0);
  const rankPoints = (trend ?? []).map((t: { rank: number }) => t.rank);

  const saveMutation = useMutation({
    mutationFn: (input: unknown) => runSaveProfile({ data: input as never }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my-profile"] });
      queryClient.invalidateQueries({ queryKey: ["leaderboard"] });
      toast.success("Profile saved");
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Could not save your profile"),
  });

  const removeMutation = useMutation({
    mutationFn: (projectId: string) => runDelete({ data: { id: projectId } as never }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my-projects"] });
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      toast.success("Project deleted");
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Could not delete this project"),
  });

  async function signOut() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    router.navigate({ to: "/auth", replace: true });
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-14 sm:px-6 sm:py-20">
      <header className="grid gap-6 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-start">
        <div className="flex min-w-0 items-start gap-4 sm:gap-5">
          <UserAvatar
            name={profile?.display_name}
            path={profile?.avatar_url}
            accent={profile?.accent_color}
            size={60}
            eager
          />
          <div className="min-w-0">
            <h1 className="truncate text-2xl font-semibold tracking-tight sm:text-3xl">
              {profile?.display_name ?? "Your profile"}
            </h1>
            <p className="mt-1 font-mono text-[12px] text-muted-foreground">@{profile?.username}</p>
            {profile?.bio ? (
              <p className="mt-3 text-[14px] leading-relaxed text-muted-foreground">{profile.bio}</p>
            ) : null}
          </div>
        </div>
        <Link
          to="/submit"
          className="flex min-h-11 items-center justify-center rounded-full border border-border px-5 text-[13px] font-medium transition-colors duration-200 hover:border-neon hover:bg-muted/60"
        >
          New submission
        </Link>
      </header>

      <div className="mt-12 grid gap-4 sm:grid-cols-3">
        {[
          ["Leaderboard position", row?.rank ? `#${row.rank}` : "—"],
          ["Total upvotes", votes.toLocaleString()],
          ["Feedback received", String(comments)],
        ].map(([label, value]) => (
          <div key={label} className={`${CARD} px-5 py-5 sm:px-6 sm:py-6`}>
            <div className="text-2xl font-semibold tracking-tight tabular-nums">{value}</div>
            <div className="mt-2 text-[12px] text-muted-foreground">{label}</div>
          </div>
        ))}
      </div>

      <section className="mt-6">
        <div className={`${CARD} px-5 py-5 sm:px-6 sm:py-6`}>
          <div className="flex flex-wrap items-baseline justify-between gap-3">
            <h2 className="text-[15px] font-semibold tracking-tight">Ranking trend</h2>
            <span className="font-mono text-[11px] text-muted-foreground">Last 7 days</span>
          </div>
          <div className="mt-4">
            <RankSparkline points={rankPoints} />
          </div>
          {rankPoints.length > 1 ? (
            <p className="mt-3 text-[12px] text-muted-foreground">
              Moved from #{rankPoints[0]} to #{rankPoints[rankPoints.length - 1]}.
            </p>
          ) : (
            <p className="mt-3 text-[12px] text-muted-foreground">Trend appears as votes come in.</p>
          )}
        </div>
      </section>

      <section className="mt-14 sm:mt-16">
        <h2 className="text-[15px] font-semibold tracking-tight">Submitted projects</h2>
        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          {mine.map((p) => (
            <div key={p.id} className={`${CARD} px-5 py-5`}>
              <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3">
                <Link
                  to="/projects/$slug"
                  params={{ slug: p.slug ?? "" }}
                  className="truncate text-[14px] font-medium tracking-tight transition-colors duration-200 hover:text-neon"
                >
                  {p.title}
                </Link>
                <span className="shrink-0 rounded-full border border-border px-2.5 py-0.5 font-mono text-[10px] text-muted-foreground">
                  {p.published ? "Published" : "Draft"}
                </span>
              </div>
              <p className="mt-2 line-clamp-2 text-[13px] leading-relaxed text-muted-foreground">
                {p.tagline}
              </p>
              <div className="mt-4 flex flex-wrap items-center gap-4 font-mono text-[11px] tabular-nums text-muted-foreground">
                <span>{(p.vote_count ?? 0).toLocaleString()} upvotes</span>
                <span>{p.comment_count ?? 0} comments</span>
              </div>
              <div className="mt-4 flex gap-2">
                <Link
                  to="/submit"
                  search={{ id: p.id ?? undefined }}
                  className="flex min-h-10 items-center rounded-full border border-border px-4 text-[12px] transition-colors duration-200 hover:border-neon"
                >
                  Edit
                </Link>
                <button
                  type="button"
                  onClick={() => removeMutation.mutate(p.id!)}
                  className="flex min-h-10 items-center rounded-full border border-border px-4 text-[12px] text-muted-foreground transition-colors duration-200 hover:border-destructive hover:text-destructive"
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
          {mine.length === 0 ? (
            <p className="text-[13px] text-muted-foreground">
              Nothing submitted yet — publish your first project to enter the race.
            </p>
          ) : null}
        </div>
      </section>

      <section className="mt-14 sm:mt-16">
        <h2 className="text-[15px] font-semibold tracking-tight">Recent activity</h2>
        <ol className="mt-5 border-l border-border pl-5 sm:pl-6">
          {(activity ?? []).length === 0 ? (
            <li className="text-[13px] text-muted-foreground">No activity yet.</li>
          ) : (
            (activity ?? []).map((a) => (
              <li key={a.id} className="relative pb-6 last:pb-0">
                <span className="absolute -left-[23px] top-1.5 size-1.5 rounded-full bg-neon sm:-left-[27px]" />
                <div className="text-[13px]">
                  You {ACTIVITY_LABELS[a.type] ?? a.type}{" "}
                  {a.project ? <span className="font-medium">{a.project.title}</span> : null}
                </div>
                <span className="mt-1 block font-mono text-[11px] text-muted-foreground/70">
                  {relativeTime(a.created_at)}
                </span>
              </li>
            ))
          )}
        </ol>
      </section>

      <section className="mt-14 sm:mt-16">
        <h2 className="text-[15px] font-semibold tracking-tight">Achievements</h2>
        <div className="mt-5">
          <AchievementTiles
            keys={earnedAchievements({
              projectCount: mine.length,
              score: votes,
              rank: row?.rank ?? null,
              commentsWritten: written ?? 0,
            })}
          />
        </div>
      </section>

      <section className="mt-14 sm:mt-16">
        <h2 className="text-[15px] font-semibold tracking-tight">Edit profile</h2>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            const parsed = profileInputSchema.safeParse({
              username: form.username,
              displayName: form.displayName,
              bio: form.bio,
              githubUrl: form.githubUrl,
              portfolioUrl: form.portfolioUrl,
              avatarPath: form.avatarPath,
            });
            if (!parsed.success) {
              toast.error(parsed.error.issues[0]?.message ?? "Please check the form");
              return;
            }
            saveMutation.mutate(parsed.data);
          }}
          className={`${CARD} mt-5 grid gap-5 p-5 sm:grid-cols-2 sm:p-6`}
        >
          <label className="text-[12px] text-muted-foreground">
            Display name
            <input
              value={form.displayName}
              onChange={(e) => setForm((f) => ({ ...f, displayName: e.target.value }))}
              className={FIELD}
            />
          </label>
          <label className="text-[12px] text-muted-foreground">
            Username
            <input
              value={form.username}
              onChange={(e) => setForm((f) => ({ ...f, username: e.target.value }))}
              className={FIELD}
            />
          </label>
          <label className="text-[12px] text-muted-foreground">
            GitHub
            <input
              value={form.githubUrl}
              onChange={(e) => setForm((f) => ({ ...f, githubUrl: e.target.value }))}
              placeholder="https://"
              className={FIELD}
            />
          </label>
          <label className="text-[12px] text-muted-foreground">
            Portfolio
            <input
              value={form.portfolioUrl}
              onChange={(e) => setForm((f) => ({ ...f, portfolioUrl: e.target.value }))}
              placeholder="https://"
              className={FIELD}
            />
          </label>
          <label className="text-[12px] text-muted-foreground sm:col-span-2">
            Bio
            <textarea
              value={form.bio}
              onChange={(e) => setForm((f) => ({ ...f, bio: e.target.value }))}
              rows={3}
              className={FIELD}
            />
          </label>
          <div className="text-[12px] text-muted-foreground sm:col-span-2">
            Profile photo
            <div className="mt-3">
              {userId ? (
                <AvatarPicker
                  userId={userId}
                  name={profile?.display_name}
                  path={profile?.avatar_url}
                  accent={profile?.accent_color}
                />
              ) : null}
            </div>
          </div>
          <div className="sm:col-span-2">
            <button
              type="submit"
              disabled={saveMutation.isPending}
              className="min-h-11 rounded-full bg-foreground px-5 text-[13px] font-medium text-background transition-colors duration-200 hover:bg-foreground/90 disabled:opacity-60"
            >
              {saveMutation.isPending ? "Saving…" : "Save changes"}
            </button>
          </div>
        </form>
      </section>

      <section className="mt-14 sm:mt-16">
        <h2 className="text-[15px] font-semibold tracking-tight">Account</h2>
        <div className={`${CARD} mt-5 divide-y divide-border`}>
          <div className="flex flex-wrap items-center gap-3 px-5 py-5 sm:px-6">
            <div className="min-w-0">
              <div className="text-[13px] font-medium">Email</div>
              <div className="mt-0.5 truncate font-mono text-[11px] text-muted-foreground">
                {user?.email ?? "—"}
              </div>
            </div>
            <span className="ml-auto font-mono text-[11px] text-muted-foreground">
              {user?.email_confirmed_at ? "Verified" : "Pending"}
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-3 px-5 py-5 sm:px-6">
            <div className="min-w-0">
              <div className="text-[13px] font-medium">Connected sign-in</div>
              <div className="mt-0.5 font-mono text-[11px] text-muted-foreground">
                {(user?.identities ?? []).map((i) => i.provider).join(", ") || "email"}
              </div>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-3 px-5 py-5 sm:px-6">
            <div className="min-w-0">
              <div className="text-[13px] font-medium">Sign out</div>
              <div className="mt-0.5 text-[12px] text-muted-foreground">End this session.</div>
            </div>
            <button
              type="button"
              onClick={signOut}
              className="ml-auto min-h-11 rounded-full border border-border px-4 text-[12px] transition-colors duration-200 hover:border-neon hover:bg-muted/60"
            >
              Sign out
            </button>
          </div>
        </div>
      </section>

      <CollaborationInvites />
    </div>
  );
}
