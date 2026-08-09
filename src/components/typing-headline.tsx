import { useEffect, useState } from "react";

const WORDS = ["BUILD.", "SHARE.", "COMPETE."] as const;
/** Longest word reserves the box width, so switching words never shifts layout. */
const WIDEST = WORDS.reduce((a, b) => (b.length > a.length ? b : a));
const TYPE_MS = 90;
const DELETE_MS = 42;
const HOLD_MS = 1750;
const GAP_MS = 420;

function usePrefersReducedMotion() {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(mq.matches);
    const onChange = (e: MediaQueryListEvent) => setReduced(e.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);
  return reduced;
}

/**
 * One word at a time: type, hold, erase, short rest, next word — looping.
 * The widest word is rendered invisibly underneath to lock the box size.
 */
export function TypingHeadline() {
  const reduced = usePrefersReducedMotion();
  const [index, setIndex] = useState(0);
  const [len, setLen] = useState(0);
  const [phase, setPhase] = useState<"typing" | "holding" | "deleting" | "resting">("typing");
  const word = WORDS[index]!;

  useEffect(() => {
    if (reduced) return;
    if (phase === "holding") {
      const id = setTimeout(() => setPhase("deleting"), HOLD_MS);
      return () => clearTimeout(id);
    }
    if (phase === "resting") {
      const id = setTimeout(() => {
        setIndex((i) => (i + 1) % WORDS.length);
        setPhase("typing");
      }, GAP_MS);
      return () => clearTimeout(id);
    }
    if (phase === "typing") {
      if (len === word.length) {
        setPhase("holding");
        return;
      }
      const id = setTimeout(() => setLen((l) => l + 1), TYPE_MS);
      return () => clearTimeout(id);
    }
    if (len === 0) {
      setPhase("resting");
      return;
    }
    const id = setTimeout(() => setLen((l) => l - 1), DELETE_MS);
    return () => clearTimeout(id);
  }, [phase, len, word, reduced]);

  const visible = reduced ? word : word.slice(0, len);

  return (
    <span className="relative inline-grid max-w-full place-items-center text-center [font-size:clamp(1.9rem,9vw,4.5rem)]">
      {/* Invisible sizer: reserves the width of the longest word plus the caret. */}
      <span aria-hidden className="invisible col-start-1 row-start-1 whitespace-pre">
        {WIDEST}
        <span className="inline-block w-[0.115em]" />
      </span>
      <span className="col-start-1 row-start-1 whitespace-pre">
        <span className="sr-only">{WORDS.join(" ")}</span>
        <span aria-hidden>{visible}</span>
        {reduced ? null : (
          <span
            aria-hidden
            className="ml-[0.06em] inline-block h-[0.78em] w-[0.055em] translate-y-[0.06em] bg-neon align-baseline"
            style={{ animation: "caret-blink 1.15s steps(1, end) infinite" }}
          />
        )}
      </span>
    </span>
  );
}
