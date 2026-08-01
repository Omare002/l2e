export const CATEGORIES = [
  "Developer Tools",
  "AI",
  "Education",
  "Community",
  "Productivity",
  "Design",
] as const;

export type Category = (typeof CATEGORIES)[number];

export const STATUSES = [
  { value: "shipped", label: "Shipped" },
  { value: "in_progress", label: "In Progress" },
  { value: "prototype", label: "Prototype" },
] as const;

export type ProjectStatus = (typeof STATUSES)[number]["value"];

export function statusLabel(value: string) {
  return STATUSES.find((s) => s.value === value)?.label ?? value;
}

export const ACHIEVEMENTS: { key: string; emoji: string; label: string; note: string }[] = [
  { key: "first-launch", emoji: "🚀", label: "First Launch", note: "Published a first project" },
  { key: "shipper", emoji: "⚡", label: "Shipper", note: "Published 3 or more projects" },
  { key: "consistent", emoji: "🎯", label: "Consistent Builder", note: "Published 5 or more projects" },
  { key: "champion", emoji: "🏆", label: "Leading the race", note: "Currently ranked #1" },
  { key: "podium", emoji: "🥇", label: "Podium", note: "Currently in the top 3" },
  { key: "favorite", emoji: "🤝", label: "Community Favorite", note: "25 or more upvotes" },
  { key: "on-fire", emoji: "🔥", label: "On Fire", note: "100 or more upvotes" },
  { key: "helpful", emoji: "❤️", label: "Helpful Reviewer", note: "Left 10 or more pieces of feedback" },
];

/** Achievements are derived from live database numbers — never stored or faked. */
export function earnedAchievements(input: {
  projectCount: number;
  score: number;
  rank: number | null;
  commentsWritten?: number;
}) {
  const keys: string[] = [];
  if (input.projectCount >= 1) keys.push("first-launch");
  if (input.projectCount >= 3) keys.push("shipper");
  if (input.projectCount >= 5) keys.push("consistent");
  if (input.rank === 1 && input.score > 0) keys.push("champion");
  if (input.rank !== null && input.rank <= 3 && input.score > 0) keys.push("podium");
  if (input.score >= 25) keys.push("favorite");
  if (input.score >= 100) keys.push("on-fire");
  if ((input.commentsWritten ?? 0) >= 10) keys.push("helpful");
  return keys;
}
