import { Link } from "@tanstack/react-router";

const NAV = [
  { to: "/projects", label: "Projects" },
  { to: "/leaderboard", label: "Leaderboard" },
  { to: "/hall-of-fame", label: "Hall of Fame" },
  { to: "/how-it-works", label: "How it works" },
  { to: "/dashboard", label: "Dashboard" },
] as const;

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-border/70 bg-background/90 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-6 px-5">
        <Link to="/" className="flex items-center gap-2">
          <span className="size-2 bg-neon" />
          <span className="font-mono text-sm font-bold tracking-[0.18em] uppercase">
            Leaderboard
          </span>
        </Link>

        <nav className="hidden items-center gap-6 md:flex">
          {NAV.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              className="font-mono text-[13px] text-muted-foreground transition-colors hover:text-foreground"
              activeProps={{ className: "text-foreground" }}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <Link
          to="/submit"
          className="bg-neon px-4 py-2 font-mono text-[13px] font-bold text-ink transition-transform hover:-translate-y-0.5"
        >
          Submit Project
        </Link>
      </div>
    </header>
  );
}