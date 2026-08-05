import { useStoredImage } from "@/lib/media";
import { initialsOf } from "@/lib/display";

type Props = {
  name: string | null | undefined;
  path: string | null | undefined;
  accent?: string | null;
  /** Rendered edge length in px. */
  size?: number;
  className?: string;
  eager?: boolean;
};

/** Profile photo with a clean initials fallback. Signed storage URLs are cached per path. */
export function UserAvatar({ name, path, accent, size = 32, className = "", eager }: Props) {
  const url = useStoredImage("avatars", path);
  return (
    <span
      className={`flex shrink-0 items-center justify-center overflow-hidden rounded-full font-mono font-semibold leading-none text-ink ${className}`}
      style={{
        width: size,
        height: size,
        background: accent ?? "var(--neon)",
        fontSize: Math.max(9, Math.round(size * 0.34)),
      }}
    >
      {url ? (
        <img
          src={url}
          alt=""
          loading={eager ? "eager" : "lazy"}
          decoding="async"
          className="size-full object-cover"
        />
      ) : (
        initialsOf(name)
      )}
    </span>
  );
}
