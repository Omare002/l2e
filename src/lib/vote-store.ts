import { PROJECTS } from "@/data/community";

export type VoteState = {
  votes: Record<string, number>;
  myVotes: Record<string, boolean>;
  accelerating: string | null;
};

const BASE: VoteState = {
  votes: Object.fromEntries(PROJECTS.map((p) => [p.slug, p.votes])),
  myVotes: {},
  accelerating: null,
};

let state: VoteState = BASE;
const listeners = new Set<() => void>();
let timer: ReturnType<typeof setInterval> | null = null;
let accelTimer: ReturnType<typeof setTimeout> | null = null;

function emit() {
  for (const l of listeners) l();
}

function set(next: Partial<VoteState>) {
  state = { ...state, ...next };
  emit();
}

function flash(slug: string) {
  if (accelTimer) clearTimeout(accelTimer);
  set({ accelerating: slug });
  accelTimer = setTimeout(() => set({ accelerating: null }), 900);
}

/** Optimistic, instant vote toggle. Phase 2 swaps this for a Cloud mutation. */
export function toggleVote(slug: string) {
  const has = state.myVotes[slug] === true;
  set({
    votes: { ...state.votes, [slug]: (state.votes[slug] ?? 0) + (has ? -1 : 1) },
    myVotes: { ...state.myVotes, [slug]: !has },
  });
  if (!has) flash(slug);
}

function startSimulation() {
  if (timer) return;
  timer = setInterval(() => {
    const p = PROJECTS[Math.floor(Math.random() * PROJECTS.length)];
    const bump = 1 + Math.floor(Math.random() * 14);
    set({ votes: { ...state.votes, [p.slug]: (state.votes[p.slug] ?? 0) + bump } });
    flash(p.slug);
  }, 2600);
}

export function subscribe(listener: () => void) {
  listeners.add(listener);
  startSimulation();
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0 && timer) {
      clearInterval(timer);
      timer = null;
    }
  };
}

export const getSnapshot = () => state;
export const getServerSnapshot = () => BASE;
