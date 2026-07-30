import { ACHIEVEMENTS } from "@/data/community";

export function AchievementTiles({ keys }: { keys?: string[] }) {
  const list = keys ? ACHIEVEMENTS.filter((a) => keys.includes(a.key)) : ACHIEVEMENTS;
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {list.map((a) => (
        <div key={a.key} className="rounded-lg border border-border bg-background px-3 py-4">
          <div className="text-xl">{a.emoji}</div>
          <div className="mt-2 font-mono text-[12px] font-bold tracking-normal">
            {a.label}
          </div>
          <div className="mt-1 font-mono text-[11px] text-muted-foreground">{a.note}</div>
        </div>
      ))}
    </div>
  );
}