export function SiteFooter() {
  return (
    <footer className="mt-24 border-t border-border/70">
      <div className="mx-auto flex max-w-6xl flex-col gap-3 px-5 py-7 font-mono text-[12px] text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <span className="size-2 bg-neon" />
          <span className="uppercase tracking-[0.16em] text-foreground">
            Leaderboard © 2026
          </span>
          <span className="hidden sm:inline">· LearnToEarn Fellowship</span>
        </div>
        <div className="flex flex-wrap gap-5">
          <a href="#" className="hover:text-foreground">Privacy</a>
          <a href="#" className="hover:text-foreground">Terms</a>
          <a href="#" className="hover:text-foreground">GitHub</a>
          <a href="#" className="hover:text-foreground">X / Twitter</a>
        </div>
      </div>
    </footer>
  );
}