/** Shared calm loading + failure primitives so refreshes never flash empty UI. */
export function SkeletonLines({ rows = 4, className = "" }: { rows?: number; className?: string }) {
  return (
    <div className={`flex flex-col gap-3 ${className}`} aria-hidden>
      {Array.from({ length: rows }).map((_, i) => (
        <div
          key={i}
          className="h-7 animate-pulse rounded-md bg-muted"
          style={{ animationDelay: `${i * 70}ms` }}
        />
      ))}
    </div>
  );
}

export function LoadFailure({
  message = "We couldn't load this just now.",
  onRetry,
}: {
  message?: string;
  onRetry?: () => void;
}) {
  return (
    <div role="alert" className="px-4 py-8 text-center sm:px-6">
      <p className="text-[13px] text-muted-foreground">{message}</p>
      {onRetry ? (
        <button
          type="button"
          onClick={onRetry}
          className="mt-4 inline-flex min-h-11 items-center rounded-full border border-border px-5 text-[13px] transition-colors duration-200 hover:border-neon"
        >
          Try again
        </button>
      ) : null}
    </div>
  );
}
