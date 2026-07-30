export function SiteFooter() {
  return (
    <footer className="mt-28 border-t border-border">
      <div className="mx-auto flex max-w-6xl flex-col gap-4 px-6 py-9 text-[13px] text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2.5">
          <span className="size-1.5 rounded-full bg-neon" />
          <span className="text-foreground">Leaderboard © 2026</span>
          <span className="hidden sm:inline">· LearnToEarn Fellowship</span>
        </div>
        <div className="flex flex-wrap gap-6">
          <a href="#" className="transition-colors duration-200 hover:text-foreground">Privacy</a>
          <a href="#" className="transition-colors duration-200 hover:text-foreground">Terms</a>
          <a href="#" className="transition-colors duration-200 hover:text-foreground">GitHub</a>
          <a href="#" className="transition-colors duration-200 hover:text-foreground">X / Twitter</a>
        </div>
      </div>
    </footer>
  );
}
