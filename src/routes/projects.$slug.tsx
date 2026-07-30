import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useState } from "react";
import { ExternalLink, Github, Triangle } from "lucide-react";
import { PROJECTS, builderBy } from "@/data/community";
import { useVotes } from "@/hooks/use-votes";

export const Route = createFileRoute("/projects/$slug")({
  loader: ({ params }) => {
    const project = PROJECTS.find((p) => p.slug === params.slug);
    if (!project) throw notFound();
    return { slug: project.slug };
  },
  head: ({ loaderData }) => {
    const project = loaderData ? PROJECTS.find((p) => p.slug === loaderData.slug) : undefined;
    if (!project) {
      return {
        meta: [{ title: "Project not found — Leaderboard" }, { name: "robots", content: "noindex" }],
      };
    }
    return {
      meta: [
        { title: `${project.name} — Leaderboard` },
        { name: "description", content: project.tagline },
        { property: "og:title", content: `${project.name} — Leaderboard` },
        { property: "og:description", content: project.tagline },
      ],
    };
  },
  component: ProjectPage,
});

function ProjectPage() {
  const { slug } = Route.useLoaderData();
  const project = PROJECTS.find((p) => p.slug === slug)!;
  const builder = builderBy(project.builder)!;
  const { toggle, voteCount, hasVoted, votes: allVotes } = useVotes();
  const votes = voteCount(slug);
  const voted = hasVoted(slug);
  const [comments, setComments] = useState(project.comments);
  const [draft, setDraft] = useState("");
  const rank =
    [...PROJECTS]
      .sort((a, b) => (allVotes[b.slug] ?? b.votes) - (allVotes[a.slug] ?? a.votes))
      .findIndex((p) => p.slug === slug) + 1;

  return (
    <div className="mx-auto max-w-5xl px-6 py-16">
      <Link to="/projects" className="font-mono text-[12px] text-muted-foreground hover:text-foreground">
        ← Back to projects
      </Link>

      <div className="mt-6 flex flex-wrap items-start justify-between gap-6">
        <div>
          <span className="bg-neon-dim px-2 py-1 font-mono text-[10px] font-bold tracking-normal">
            Rank #{rank} · {project.category} · {project.status}
          </span>
          <h1 className="mt-4 font-mono text-4xl font-semibold sm:text-5xl">
            {project.name}
          </h1>
          <p className="mt-3 max-w-2xl font-mono text-[13px] text-muted-foreground">
            {project.tagline}
          </p>
        </div>
        <button
          aria-pressed={voted}
          onClick={() => toggle(slug)}
          className={`flex items-center gap-2 px-5 py-3 font-mono text-sm font-bold ${
            voted ? "bg-neon text-ink" : "bg-ink text-background"
          }`}
        >
          <Triangle className="size-3.5 fill-current" /> {votes}
        </button>
      </div>

      <div
        className="mt-8 h-64 w-full border border-border"
        style={{
          background: `repeating-linear-gradient(135deg, ${project.thumbTone}33 0 10px, #17171708 10px 20px)`,
        }}
        aria-hidden
      />

      <div className="mt-8 grid gap-10 lg:grid-cols-[1fr_280px]">
        <div>
          <h2 className="font-mono text-sm font-bold tracking-normal">About</h2>
          <p className="mt-3 font-mono text-[13px] leading-relaxed text-foreground/80">
            {project.description}
          </p>

          <h2 className="mt-10 font-mono text-sm font-bold tracking-normal">
            Feedback ({comments.length})
          </h2>
          <p className="mt-2 font-mono text-[12px] text-muted-foreground">
            Constructive notes, questions and celebrations — all welcome.
          </p>

          <form
            className="mt-4"
            onSubmit={(e) => {
              e.preventDefault();
              if (!draft.trim()) return;
              setComments((cs) => [
                { id: `${Date.now()}`, author: "you", body: draft.trim(), at: "now", kind: "feedback" },
                ...cs,
              ]);
              setDraft("");
            }}
          >
            <textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              rows={3}
              placeholder="What would make this project better?"
              className="w-full border border-border bg-background p-3 font-mono text-[13px] outline-none focus:border-neon"
            />
            <button className="mt-2 bg-ink px-4 py-2 font-mono text-[12px] font-bold text-background">
              Post feedback
            </button>
          </form>

          <ul className="mt-6 divide-y divide-border border-y border-border">
            {comments.map((cm) => (
              <li key={cm.id} className="py-4">
                <div className="flex items-center gap-2 font-mono text-[11px] text-muted-foreground">
                  <span className="font-bold text-foreground">@{cm.author}</span>
                  <span>· {cm.at}</span>
                  <span className="ml-auto bg-muted px-2 py-0.5 tracking-normalr">
                    {cm.kind}
                  </span>
                </div>
                <p className="mt-2 font-mono text-[13px] text-foreground/80">{cm.body}</p>
              </li>
            ))}
          </ul>
        </div>

        <aside className="space-y-6">
          <div className="border border-border p-4">
            <div className="font-mono text-[11px] tracking-normal text-muted-foreground">
              Builder
            </div>
            <Link
              to="/builders/$username"
              params={{ username: builder.username }}
              className="mt-3 flex items-center gap-3"
            >
              <span
                className="flex size-10 items-center justify-center font-mono text-[12px] font-bold text-ink"
                style={{ background: builder.color }}
              >
                {builder.initials}
              </span>
              <span>
                <span className="block font-mono text-[13px] font-bold">{builder.name}</span>
                <span className="block font-mono text-[11px] text-muted-foreground">
                  @{builder.username}
                </span>
              </span>
            </Link>
          </div>

          <div className="border border-border p-4">
            <div className="font-mono text-[11px] tracking-normal text-muted-foreground">
              Tech Stack
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              {project.tech.map((t) => (
                <span key={t} className="bg-muted px-2 py-1 font-mono text-[10px]">
                  {t}
                </span>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <a
              href={project.demoUrl}
              className="flex items-center justify-center gap-2 bg-neon px-4 py-3 font-mono text-[12px] font-bold text-ink"
            >
              <ExternalLink className="size-3.5" /> Live Demo
            </a>
            <a
              href={project.repoUrl}
              className="flex items-center justify-center gap-2 border border-border px-4 py-3 font-mono text-[12px] font-bold"
            >
              <Github className="size-3.5" /> GitHub
            </a>
          </div>
        </aside>
      </div>
    </div>
  );
}