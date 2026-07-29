import type { ReactNode } from "react";

export function SectionHeading({
  title,
  subtitle,
  right,
}: {
  title: string;
  subtitle?: string;
  right?: ReactNode;
}) {
  return (
    <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h2 className="font-mono text-lg font-bold uppercase tracking-tight sm:text-xl">
          {title}
        </h2>
        {subtitle ? (
          <p className="mt-1 font-mono text-[12px] text-muted-foreground">{subtitle}</p>
        ) : null}
      </div>
      {right}
    </div>
  );
}