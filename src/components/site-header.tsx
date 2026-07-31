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
    <header className="sticky top-0 z-40 border-b border-border bg-background/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-8 px-6">
        <Link to="/" className="group flex items-center gap-2.5">
          <span className="size-1.5 rounded-full bg-neon" />
          <span className="text-sm font-semibold tracking-tight">Leaderboard</span>
        </Link>

        <nav className="hidden items-center gap-7 md:flex">
          {NAV.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              className="relative py-1 text-[13px] text-muted-foreground transition-colors duration-200 hover:text-foreground"
              activeProps={{
                className:
                  "text-foreground after:absolute after:inset-x-0 after:-bottom-[9px] after:h-px after:bg-neon",
              }}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <Link
          to="/submit"
          className="rounded-full border border-border px-4 py-2 text-[13px] font-medium transition-colors duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] hover:border-neon hover:bg-muted/60 hover:text-foreground"
        >
          Submit Project
        </Link>
      </div>
    </header>
  );
}
