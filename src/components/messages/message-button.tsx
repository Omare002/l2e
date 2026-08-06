import { Link } from "@tanstack/react-router";
import { MessageSquare } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";

type Props = {
  recipientId: string | null | undefined;
  projectId?: string | null;
  label?: string;
  /** "button" for a pill CTA, "icon" for compact rows. */
  variant?: "button" | "icon";
  className?: string;
};

/** Opens (or reopens) a private thread with a builder, carrying project context. */
export function MessageButton({
  recipientId,
  projectId,
  label = "Message builder",
  variant = "button",
  className = "",
}: Props) {
  const { userId, isAuthenticated } = useAuth();
  if (!recipientId || recipientId === userId) return null;

  const search = isAuthenticated
    ? { to: recipientId, ...(projectId ? { project: projectId } : {}) }
    : undefined;

  const shared =
    variant === "icon"
      ? "flex size-9 items-center justify-center rounded-full border border-transparent text-muted-foreground transition-colors duration-200 hover:border-neon hover:text-foreground"
      : "inline-flex min-h-11 items-center gap-2 rounded-full border border-border px-4 text-[13px] font-medium transition-colors duration-200 hover:border-neon hover:bg-muted/60";

  if (!isAuthenticated) {
    return (
      <Link to="/auth" className={`${shared} ${className}`} aria-label={label} title="Sign in to message">
        <MessageSquare className="size-4" />
        {variant === "button" ? label : null}
      </Link>
    );
  }

  return (
    <Link
      to="/messages"
      search={search}
      className={`${shared} ${className}`}
      aria-label={label}
      title={label}
    >
      <MessageSquare className="size-4" />
      {variant === "button" ? label : null}
    </Link>
  );
}
