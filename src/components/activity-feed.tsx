import { useEffect, useState } from "react";
import { ACTIVITY_SEEDS } from "@/data/community";

export function ActivityFeed() {
  const [items, setItems] = useState(() => ACTIVITY_SEEDS.slice(0, 6));

  useEffect(() => {
    let i = 0;
    const id = setInterval(() => {
      i += 1;
      const next = ACTIVITY_SEEDS[i % ACTIVITY_SEEDS.length];
      setItems((prev) => [next, ...prev].slice(0, 8));
    }, 3800);
    return () => clearInterval(id);
  }, []);

  return (
    <ul className="divide-y divide-border border border-border">
      {items.map((line, i) => (
        <li
          key={`${line}-${i}`}
          className="flex items-center gap-3 px-4 py-3 font-mono text-[12px]"
        >
          <span className={`size-1.5 ${i === 0 ? "bg-neon" : "bg-muted-foreground/50"}`} />
          <span className="text-foreground/80">{line}</span>
          <span className="ml-auto text-muted-foreground">{i === 0 ? "now" : `${i * 4}m`}</span>
        </li>
      ))}
    </ul>
  );
}