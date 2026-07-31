import { useEffect, useState } from "react";

const SENTENCE = "Build. Share. Compete.";
const TYPE_MS = 82;
const DELETE_MS = 34;
const HOLD_MS = 2200;
const GAP_MS = 600;

/**
 * One continuous sentence typewriter. The full sentence is rendered invisibly
 * underneath so the box never resizes — no layout shift, no reflow.
 */
export function TypingHeadline() {
  const [len, setLen] = useState(0);
  const [phase, setPhase] = useState<"typing" | "holding" | "deleting" | "resting">("typing");

  useEffect(() => {
    if (phase === "holding") {
      const id = setTimeout(() => setPhase("deleting"), HOLD_MS);
      return () => clearTimeout(id);
    }
    if (phase === "resting") {
      const id = setTimeout(() => setPhase("typing"), GAP_MS);
      return () => clearTimeout(id);
    }
    if (phase === "typing") {
      if (len === SENTENCE.length) {
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
  }, [phase, len]);

  return (
    <span className="relative inline-grid text-left">
      <span aria-hidden className="invisible col-start-1 row-start-1 whitespace-pre px-[0.35ch]">
        {SENTENCE}
      </span>
      <span className="col-start-1 row-start-1 justify-self-start whitespace-pre pl-[0.35ch]">
        <span className="sr-only">{SENTENCE}</span>
        <span aria-hidden>{SENTENCE.slice(0, len)}</span>
        <span
          aria-hidden
          className="ml-[0.06em] inline-block h-[0.78em] w-[0.055em] translate-y-[0.06em] bg-neon align-baseline"
          style={{ animation: "caret-blink 1.15s steps(1, end) infinite" }}
        />
      </span>
    </span>
  );
}
