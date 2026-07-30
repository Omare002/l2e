import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { ACTIVITY_SEEDS } from "@/data/community";

export function ActivityFeed() {
  const [items, setItems] = useState(() => ACTIVITY_SEEDS.slice(0, 6));

  useEffect(() => {
    let i = 0;
    const id = setInterval(() => {
      i += 1;
      const next = ACTIVITY_SEEDS[i % ACTIVITY_SEEDS.length];
      setItems((prev) => [next, ...prev].slice(0, 8));
    }, 6000);
    return () => clearInterval(id);
  }, []);

  return (
    <ul className="divide-y divide-border overflow-hidden rounded-lg border border-border">
      <AnimatePresence initial={false}>
        {items.map((line, i) => (
          <motion.li
            key={`${line}-${i}`}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
            className="flex items-center gap-3.5 px-5 py-3.5 text-[13px]"
          >
            <span
              className={`size-1.5 shrink-0 rounded-full ${
                i === 0 ? "bg-neon" : "bg-muted-foreground/30"
              }`}
            />
            <span className="text-foreground/80">{line}</span>
            <span className="ml-auto font-mono text-[11px] text-muted-foreground">
              {i === 0 ? "now" : `${i * 4}m`}
            </span>
          </motion.li>
        ))}
      </AnimatePresence>
    </ul>
  );
}
