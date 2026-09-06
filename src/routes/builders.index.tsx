import { useEffect, useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Search, X } from "lucide-react";
import { UserAvatar } from "@/components/user-avatar";
import { FollowButton } from "@/components/follow-button";
import { LoadFailure, SkeletonLines } from "@/components/skeleton-block";
import { builderDirectoryQuery } from "@/lib/discovery";

export const Route = createFileRoute("/builders/")({
  head: () => ({
    meta: [
      { title: "Find builders — Leaderboard" },
      {
        name: "description",
        content:
          "Search the LearnToEarn community by username, see each builder's rank and projects, and follow the makers you want to keep up with.",
      },
      { property: "og:title", content: "Find builders — Leaderboard" },
      {
        property: "og:description",
        content: "Search builders by username, see their rank, and follow the ones you like.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: BuilderDirectory,
});

function BuilderDirectory() {
  const [term, setTerm] = useState("");
  const [debounced, setDebounced] = useState("");

  useEffect(() => {
    const id = window.setTimeout(() => setDebounced(term), 180);
    return () => window.clearTimeout(id);
  }, [term]);

  const query = useQuery(builderDirectoryQuery(debounced));
  const results = useMemo(() => query.data ?? [], [query.data]);
  const searching = term.trim().length > 0;

  return (
    <div className="mx-auto max-w-5xl px-4 py-14 sm:px-6 sm:py-16">
      <h1 className="text-3xl font-semibold tracking-tight sm:text-5xl">Find builders</h1>
      <p className="mt-4 max-w-xl text-[13px] leading-relaxed text-foreground/80 sm:text-[14px]">
        Search by username to see who's building. Every profile is public — following is the only
        part that needs an account.
      </p>

      <div className="glass-panel mt-8 flex items-center gap-3 rounded-full border border-border px-4 py-2.5 transition-colors duration-200 focus-within:border-neon/60">
        <Search className="size-4 shrink-0 text-muted-foreground" />
        <input
          value={term}
          onChange={(e) => setTerm(e.target.value)}
          placeholder="Search @username or name"
          aria-label="Search builders by username"
          autoComplete="off"
          spellCheck={false}
          className="min-w-0 flex-1 bg-transparent text-[14px] outline-none placeholder:text-muted-foreground"
        />
        {term ? (
          <button
            type="button"
            onClick={() => setTerm("")}
            aria-label="Clear search"
            className="rounded-full p-1 text-muted-foreground transition-colors duration-200 hover:text-foreground"
          >
            <X className="size-4" />
          </button>
        ) : null}
      </div>

      <p className="mt-3 min-h-5 text-[12px] text-muted-foreground">
        {query.isFetching && searching
          ? "Searching…"
          : searching
            ? `${results.length} ${results.length === 1 ? "match" : "matches"} for “${term.trim()}”`
            : "Showing the top of the board"}
      </p>

      <div className="mt-4 overflow-hidden rounded-lg border border-border">
        {query.isLoading && results.length === 0 ? (
          <SkeletonLines rows={6} className="p-4 sm:p-5" />
        ) : query.isError && results.length === 0 ? (
          <LoadFailure message="The directory couldn't load just now." onRetry={() => query.refetch()} />
        ) : results.length === 0 ? (
          <div className="px-5 py-10 text-[13px] text-muted-foreground">
            {searching ? `No builder matches “${term.trim()}” yet.` : "No builders yet."}
          </div>
        ) : (
          results.map((b) => (
            <div
              key={b.id}
              className="flex flex-wrap items-center gap-x-3 gap-y-3 border-b border-border px-4 py-4 transition-colors duration-200 last:border-b-0 hover:bg-muted/50 sm:flex-nowrap sm:gap-4 sm:px-5"
            >
              <span className="w-8 shrink-0 font-mono text-[12px] tabular-nums text-muted-foreground">
                {b.rank ? String(b.rank).padStart(2, "0") : "—"}
              </span>
              <Link
                to="/builders/$username"
                params={{ username: b.username }}
                className="flex min-w-0 flex-1 basis-[calc(100%-2.75rem)] items-center gap-3 sm:basis-auto"
              >
                <UserAvatar
                  name={b.display_name}
                  path={b.avatar_url}
                  accent={b.accent_color}
                  size={36}
                />
                <span className="min-w-0">
                  <span className="block truncate text-[14px] font-medium transition-colors duration-200 hover:text-neon">
                    {b.display_name}
                  </span>
                  <span className="block truncate font-mono text-[12px] text-muted-foreground">
                    @{b.username}
                  </span>
                </span>
              </Link>
              <span className="ml-11 shrink-0 font-mono text-[12px] tabular-nums text-muted-foreground sm:ml-0 sm:text-right">
                <span className="text-foreground">{b.score.toLocaleString()}</span> XP
                <span className="hidden sm:inline"> · {b.project_count} projects</span>
              </span>
              <FollowButton
                targetId={b.id}
                username={b.username}
                className="ml-auto shrink-0"
              />
            </div>
          ))
        )}
      </div>
    </div>
  );
}
