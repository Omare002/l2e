import { useEffect, useState } from "react";

const WORDS = ["Build.", "Share.", "Compete."];
const TYPE_MS = 78;
const DELETE_MS = 38;
const HOLD_MS = 1500;
const GAP_MS = 320;

/**
 * Calm, looping typewriter. Fixed-width container prevents layout jitter and
 * the caret keeps a steady, unhurried blink.
 */
export function TypingHeadline() {
  const [index, setIndex] = useState(0);
  const [len, setLen] = useState(0);
  const [phase, setPhase] = useState<"typing" | "holding" | "deleting">("typing");

  const word = WORDS[index];

  useEffect(() => {
    if (phase === "holding") {
      const id = setTimeout(() => setPhase("deleting"), HOLD_MS);
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
      const id = setTimeout(() => {
        setIndex((i) => (i + 1) % WORDS.length);
        setPhase("typing");
      }, GAP_MS);
      return () => clearTimeout(id);
    }
    const id = setTimeout(() => setLen((l) => l - 1), DELETE_MS);
    return () => clearTimeout(id);
  }, [phase, len, word]);

  const longest = WORDS.reduce((a, b) => (a.length >= b.length ? a : b));

  return (
    <span className="relative inline-grid">
      <span aria-hidden className="invisible col-start-1 row-start-1 pr-[0.6ch]">
        {longest}
      </span>
      <span className="col-start-1 row-start-1 justify-self-start whitespace-pre">
        <span className="sr-only">{WORDS.join(" ")}</span>
        <span aria-hidden>{word.slice(0, len)}</span>
        <span
          aria-hidden
          className="ml-[0.08em] inline-block h-[0.82em] w-[0.06em] translate-y-[0.06em] bg-neon align-baseline"
          style={{ animation: "caret-blink 1.1s steps(1, end) infinite" }}
        />
      </span>
    </span>
  );
}
