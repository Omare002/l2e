import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/copyright")({
  head: () => ({
    meta: [
      { title: "Intellectual property & copyright policy — Leaderboard" },
      {
        name: "description",
        content:
          "How Leaderboard handles copied work, credit and copyright complaints, plus how to file a formal complaint.",
      },
      { property: "og:title", content: "Intellectual property & copyright policy — Leaderboard" },
      {
        property: "og:description",
        content: "Our rules on original work, credit and copyright complaints.",
      },
      { property: "og:type", content: "article" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: CopyrightPolicy,
});

const SECTIONS = [
  {
    title: "Ship your own work",
    body: "Everything you post here should be built by you, or by a team you were part of. You may not copy another creator's project, clone their site, or re-upload their code, designs, writing or media and present it as your own.",
  },
  {
    title: "Credit what you didn't build",
    body: "Templates, starter kits, open-source libraries, tutorials, stock images and AI-generated assets are all welcome — say so in your description. Building on someone else's work is fine; claiming it as yours is not.",
  },
  {
    title: "Respect licences",
    body: "If you use code or assets under a licence, follow it: keep attribution notices, honour non-commercial terms, and don't republish paid assets for free.",
  },
  {
    title: "What happens after a report",
    body: "Reported content stays online while a moderator reviews it — nothing is deleted automatically. A moderator may dismiss the report, warn the author, hide the content while it's checked, or suspend an account for repeated or serious breaches. Authors are notified when action is taken.",
  },
  {
    title: "Repeat infringement",
    body: "Accounts that repeatedly copy other people's work can be suspended, and their projects removed from the leaderboard and public pages.",
  },
];

function CopyrightPolicy() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-14 sm:px-6 sm:py-16">
      <span className="rounded-full bg-neon-dim px-2.5 py-1 font-mono text-[10px]">Policy</span>
      <h1 className="mt-4 text-3xl font-semibold tracking-tight sm:text-4xl">
        Intellectual property &amp; copyright
      </h1>
      <p className="mt-4 text-[14px] leading-relaxed text-muted-foreground">
        Leaderboard exists to celebrate what builders actually make. Passing off someone else's work
        as your own undermines every honest builder on the board, so we treat it seriously.
      </p>

      <div className="mt-10 grid gap-8">
        {SECTIONS.map((section) => (
          <section key={section.title}>
            <h2 className="text-[15px] font-semibold tracking-tight">{section.title}</h2>
            <p className="mt-2 text-[14px] leading-relaxed text-muted-foreground">{section.body}</p>
          </section>
        ))}
      </div>

      <div className="surface-card mt-12 p-5 sm:p-6">
        <h2 className="text-[15px] font-semibold tracking-tight">Think something here is yours?</h2>
        <p className="mt-2 text-[14px] leading-relaxed text-muted-foreground">
          Anyone can flag content with the <strong className="text-foreground">Report</strong> action
          on a project, forum post, comment or profile. If you are the rights holder and want to make
          a formal claim, use the copyright complaint form — it collects the work, the infringing
          link, your contact details and the sworn statements we need to act.
        </p>
        <div className="mt-5 flex flex-wrap gap-2.5">
          <Link
            to="/copyright-complaint"
            className="flex min-h-11 items-center rounded-full bg-foreground px-5 text-[13px] font-medium text-background transition-colors duration-200 hover:bg-foreground/90"
          >
            File a copyright complaint
          </Link>
          <Link
            to="/projects"
            className="flex min-h-11 items-center rounded-full border border-border px-5 text-[13px] transition-colors duration-200 hover:border-neon"
          >
            Browse projects
          </Link>
        </div>
      </div>
    </div>
  );
}
