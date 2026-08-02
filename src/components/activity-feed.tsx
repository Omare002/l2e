import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { AnimatePresence, motion } from "motion/react";
import { activityQuery } from "@/lib/db";
import { ACTIVITY_LABELS, relativeTime } from "@/lib/display";

export function ActivityFeed({ limit = 8 }: { limit?: number }) {
  const { data, isLoading } = useQuery(activityQuery(limit));
  const items = data ?? [];

  if (isLoading) {
    return (
      <ul className="divide-y divide-border overflow-hidden rounded-lg border border-border">
        {Array.from({ length: 4 }).map((_, i) => (
          <li key={i} className="px-4 py-4 sm:px-5">
            <div className="h-3.5 w-2/3 animate-pulse rounded bg-muted" />
          </li>
        ))}
      </ul>
    );
  }

  if (items.length === 0) {
    return (
      <div className="rounded-lg border border-border px-5 py-8 text-center text-[13px] text-muted-foreground">
        Nothing has happened yet. Be the first to ship something.
      </div>
    );
  }

  return (
    <ul className="divide-y divide-border overflow-hidden rounded-lg border border-border">
      <AnimatePresence initial={false}>
        {items.map((item, i) => (
          <motion.li
            key={item.id}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
            className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 px-4 py-3.5 text-[13px] sm:px-5"
          >
            <span
              className={`size-1.5 shrink-0 rounded-full ${
                i === 0 ? "bg-neon" : "bg-muted-foreground/30"
              }`}
            />
            <span className="min-w-0 truncate text-foreground/80">
              <Link
                to="/builders/$username"
                params={{ username: item.actor?.username ?? "" }}
                className="font-medium transition-colors duration-200 hover:text-neon"
              >
                {item.actor?.display_name ?? "Someone"}
              </Link>{" "}
              {ACTIVITY_LABELS[item.type] ?? item.type}
              {item.project ? (
                <>
                  {" "}
                  <Link
                    to="/projects/$slug"
                    params={{ slug: item.project.slug }}
                    className="transition-colors duration-200 hover:text-neon"
                  >
                    {item.project.title}
                  </Link>
                </>
              ) : null}
            </span>
            <span className="shrink-0 font-mono text-[11px] text-muted-foreground">
              {relativeTime(item.created_at)}
            </span>
          </motion.li>
        ))}
      </AnimatePresence>
    </ul>
  );
}
