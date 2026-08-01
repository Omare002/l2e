export type Builder = {
  username: string;
  name: string;
  initials: string;
  color: string;
  bio: string;
  skills: string[];
  github: string;
  linkedin: string;
  portfolio: string;
  followers: number;
  totalVotes: number;
  achievements: string[];
  joined: string;
};

export type Project = {
  slug: string;
  name: string;
  tagline: string;
  description: string;
  builder: string;
  tech: string[];
  category: Category;
  status: "Shipped" | "In Progress" | "Prototype";
  demoUrl: string;
  repoUrl: string;
  votes: number;
  comments: Comment[];
  createdAt: string;
  updatedAt: string;
  thumbTone: string;
};

export type Comment = {
  id: string;
  author: string;
  body: string;
  at: string;
  kind: "feedback" | "question" | "celebration";
};

export type Category =
  | "Developer Tools"
  | "AI"
  | "Education"
  | "Community"
  | "Productivity"
  | "Design";

export const CATEGORIES: Category[] = [
  "Developer Tools",
  "AI",
  "Education",
  "Community",
  "Productivity",
  "Design",
];

export const ACHIEVEMENTS: { key: string; emoji: string; label: string; note: string }[] = [
  { key: "first-launch", emoji: "🚀", label: "First Launch", note: "Shipped a first project" },
  { key: "on-fire", emoji: "🔥", label: "On Fire", note: "3 weeks in the top 5" },
  { key: "champion", emoji: "🏆", label: "Weekly Champion", note: "Won a weekly season" },
  { key: "innovative", emoji: "💡", label: "Most Innovative", note: "Voted most original build" },
  { key: "favorite", emoji: "🤝", label: "Community Favorite", note: "100+ upvotes in a week" },
  { key: "fast", emoji: "⚡", label: "Fast Builder", note: "Shipped in under 7 days" },
  { key: "consistent", emoji: "🎯", label: "Consistent Builder", note: "Shipped 4 weeks straight" },
  { key: "helpful", emoji: "❤️", label: "Most Helpful Reviewer", note: "50+ pieces of feedback" },
];

export const BUILDERS: Builder[] = [
  {
    username: "alexbuilds",
    name: "Alex Codes",
    initials: "AC",
    color: "#7CFC00",
    bio: "Learning in public. Shipping small tools that make indie building less lonely.",
    skills: ["React", "TypeScript", "Postgres", "Design Systems"],
    github: "https://github.com/alexbuilds",
    linkedin: "https://linkedin.com/in/alexbuilds",
    portfolio: "https://alexcodes.dev",
    followers: 412,
    totalVotes: 2140,
    achievements: ["first-launch", "champion", "on-fire", "fast"],
    joined: "2025-11-02",
  },
  {
    username: "samdev",
    name: "Sam Dev",
    initials: "SD",
    color: "#A5A5A5",
    bio: "On-device AI nerd. If it can run in the browser, I will make it run in the browser.",
    skills: ["WebGPU", "Rust", "ML", "Next.js"],
    github: "https://github.com/samdev",
    linkedin: "https://linkedin.com/in/samdev",
    portfolio: "https://samdev.io",
    followers: 388,
    totalVotes: 1890,
    achievements: ["innovative", "first-launch", "consistent"],
    joined: "2025-11-14",
  },
  {
    username: "kyles",
    name: "Kyle Shipz",
    initials: "KS",
    color: "#C08A6A",
    bio: "Type nerd, tooling maximalist. Fellowship cohort 3.",
    skills: ["Typography", "Canvas", "Svelte", "Figma"],
    github: "https://github.com/kyles",
    linkedin: "https://linkedin.com/in/kyles",
    portfolio: "https://kyleshipz.com",
    followers: 271,
    totalVotes: 1420,
    achievements: ["first-launch", "favorite"],
    joined: "2025-12-01",
  },
  {
    username: "jj",
    name: "Jordan J.",
    initials: "JJ",
    color: "#7CFC00",
    bio: "Building community software. Matching people beats matching algorithms.",
    skills: ["React Native", "Supabase", "Growth"],
    github: "https://github.com/jj",
    linkedin: "https://linkedin.com/in/jj",
    portfolio: "https://jordan.build",
    followers: 190,
    totalVotes: 980,
    achievements: ["first-launch", "helpful"],
    joined: "2026-01-08",
  },
  {
    username: "taylorm",
    name: "Taylor M.",
    initials: "TM",
    color: "#7CFC00",
    bio: "Study tools for people who never learned how to study. Me. I am people.",
    skills: ["Vue", "Learning Science", "Postgres"],
    github: "https://github.com/taylorm",
    linkedin: "https://linkedin.com/in/taylorm",
    portfolio: "https://taylor.study",
    followers: 164,
    totalVotes: 760,
    achievements: ["first-launch", "consistent"],
    joined: "2026-01-19",
  },
  {
    username: "morgank",
    name: "Morgan K.",
    initials: "MK",
    color: "#7CFC00",
    bio: "Devrel by day, weird side projects by night.",
    skills: ["Go", "CLI", "Docs"],
    github: "https://github.com/morgank",
    linkedin: "https://linkedin.com/in/morgank",
    portfolio: "https://morgan.sh",
    followers: 133,
    totalVotes: 610,
    achievements: ["first-launch", "helpful"],
    joined: "2026-02-02",
  },
  {
    username: "caseyb",
    name: "Casey B.",
    initials: "CB",
    color: "#7CFC00",
    bio: "Designer learning to code. Currently obsessed with motion.",
    skills: ["Figma", "Framer Motion", "CSS"],
    github: "https://github.com/caseyb",
    linkedin: "https://linkedin.com/in/caseyb",
    portfolio: "https://casey.design",
    followers: 98,
    totalVotes: 430,
    achievements: ["first-launch"],
    joined: "2026-03-11",
  },
  {
    username: "jamiel",
    name: "Jamie L.",
    initials: "JL",
    color: "#7CFC00",
    bio: "Week one of the fellowship. Already shipping.",
    skills: ["HTML", "JavaScript", "Curiosity"],
    github: "https://github.com/jamiel",
    linkedin: "https://linkedin.com/in/jamiel",
    portfolio: "https://jamie.dev",
    followers: 54,
    totalVotes: 210,
    achievements: ["first-launch"],
    joined: "2026-06-24",
  },
];

function c(id: string, author: string, body: string, at: string, kind: Comment["kind"]): Comment {
  return { id, author, body, at, kind };
}

export const PROJECTS: Project[] = [
  {
    slug: "shipfast-v2",
    name: "ShipFast v2.0",
    tagline: "Real-time analytics for indie maker metrics.",
    description:
      "Just shipped the new analytics dashboard. Tracking indie maker metrics in real-time, built in 4 days. Every chart streams straight from Postgres with zero polling, and the onboarding takes about ninety seconds.",
    builder: "alexbuilds",
    tech: ["Next.js", "Supabase", "Recharts"],
    category: "Developer Tools",
    status: "Shipped",
    demoUrl: "https://shipfast.demo",
    repoUrl: "https://github.com/alexbuilds/shipfast",
    votes: 450,
    createdAt: "2026-07-29T08:00:00Z",
    updatedAt: "2026-07-29T18:00:00Z",
    thumbTone: "#7CFC00",
    comments: [
      c("c1", "samdev", "The streaming chart is buttery. How are you batching updates?", "2h", "question"),
      c("c2", "kyles", "Onboarding is the cleanest I've seen in this cohort. Ship it.", "4h", "celebration"),
      c("c3", "jj", "Small nit: the empty state could suggest a first metric to track.", "6h", "feedback"),
    ],
  },
  {
    slug: "ai-background-remover",
    name: "AI Background Remover",
    tagline: "Unlimited background removal, fully on-device.",
    description:
      "Free, unlimited background removal right in the browser. No upload required, runs entirely on-device using transformers.js and WebGPU. Nothing ever leaves your machine.",
    builder: "samdev",
    tech: ["AI", "WebGPU", "transformers.js"],
    category: "AI",
    status: "Shipped",
    demoUrl: "https://cutout.demo",
    repoUrl: "https://github.com/samdev/cutout",
    votes: 380,
    createdAt: "2026-07-29T05:00:00Z",
    updatedAt: "2026-07-29T15:00:00Z",
    thumbTone: "#A5A5A5",
    comments: [
      c("c4", "alexbuilds", "On-device is the right call. Privacy sells itself.", "3h", "celebration"),
      c("c5", "morgank", "Would love a CLI wrapper for batch jobs.", "5h", "feedback"),
    ],
  },
  {
    slug: "typeforge",
    name: "TypeForge — Font Generator",
    tagline: "Custom variable fonts from a single prompt.",
    description:
      "Generate custom variable fonts from a single prompt. Great for finding that perfect aesthetic for your landing page, and every export ships with a working @font-face snippet.",
    builder: "kyles",
    tech: ["Design", "SaaS", "Canvas"],
    category: "Design",
    status: "Shipped",
    demoUrl: "https://typeforge.demo",
    repoUrl: "https://github.com/kyles/typeforge",
    votes: 210,
    createdAt: "2026-07-28T09:00:00Z",
    updatedAt: "2026-07-29T09:00:00Z",
    thumbTone: "#C08A6A",
    comments: [
      c("c6", "caseyb", "The weight axis preview is so satisfying to drag.", "1d", "celebration"),
      c("c7", "taylorm", "Can you add a contrast axis?", "1d", "question"),
    ],
  },
  {
    slug: "devmatch",
    name: "DevMatch",
    tagline: "Tinder, but for finding co-founders.",
    description:
      "Swipe right on builders whose skills complement yours. 500 matches in week one. Matching runs on a simple skill-complement score rather than an opaque ranking model.",
    builder: "jj",
    tech: ["Community", "React", "Supabase"],
    category: "Community",
    status: "Shipped",
    demoUrl: "https://devmatch.demo",
    repoUrl: "https://github.com/jj/devmatch",
    votes: 150,
    createdAt: "2026-07-27T12:00:00Z",
    updatedAt: "2026-07-28T12:00:00Z",
    thumbTone: "#7CFC00",
    comments: [c("c8", "jamiel", "Matched with two people already. Wild.", "2d", "celebration")],
  },
  {
    slug: "studyhub",
    name: "StudyHub",
    tagline: "Spaced repetition for cohort-based learning.",
    description:
      "Turn your fellowship notes into spaced-repetition decks automatically. Import from Notion, review in two minutes a day, and track retention week over week.",
    builder: "taylorm",
    tech: ["Vue", "Postgres", "Notion API"],
    category: "Education",
    status: "In Progress",
    demoUrl: "https://studyhub.demo",
    repoUrl: "https://github.com/taylorm/studyhub",
    votes: 128,
    createdAt: "2026-07-26T10:00:00Z",
    updatedAt: "2026-07-29T11:00:00Z",
    thumbTone: "#7CFC00",
    comments: [
      c("c9", "morgank", "The Notion import saved me an hour. Thank you.", "1d", "celebration"),
      c("c10", "alexbuilds", "Retention graph needs a baseline line to compare against.", "2d", "feedback"),
    ],
  },
  {
    slug: "shipnotes",
    name: "ShipNotes CLI",
    tagline: "Changelogs generated from your commits.",
    description:
      "A tiny Go CLI that reads your git history and writes a human changelog. No config, no AI hallucinations, just conventional commits parsed properly.",
    builder: "morgank",
    tech: ["Go", "CLI", "Git"],
    category: "Developer Tools",
    status: "Shipped",
    demoUrl: "https://shipnotes.demo",
    repoUrl: "https://github.com/morgank/shipnotes",
    votes: 96,
    createdAt: "2026-07-25T08:00:00Z",
    updatedAt: "2026-07-27T08:00:00Z",
    thumbTone: "#A5A5A5",
    comments: [c("c11", "kyles", "Dropped it into three repos today.", "3d", "celebration")],
  },
  {
    slug: "motionkit",
    name: "MotionKit",
    tagline: "Copy-paste motion primitives for React.",
    description:
      "Twenty-four motion primitives with the code visible on hover. Built while learning Framer Motion in public, one component per day.",
    builder: "caseyb",
    tech: ["React", "Framer Motion", "Design"],
    category: "Design",
    status: "In Progress",
    demoUrl: "https://motionkit.demo",
    repoUrl: "https://github.com/caseyb/motionkit",
    votes: 74,
    createdAt: "2026-07-24T08:00:00Z",
    updatedAt: "2026-07-29T07:00:00Z",
    thumbTone: "#7CFC00",
    comments: [c("c12", "jj", "The stagger example is a great teaching artifact.", "2d", "feedback")],
  },
  {
    slug: "portfolio-v2",
    name: "Portfolio V2",
    tagline: "A first portfolio, built in week one.",
    description:
      "My very first shipped project in the fellowship. Hand-written HTML and CSS, no framework, deployed on a Friday night.",
    builder: "jamiel",
    tech: ["HTML", "CSS", "Vanilla JS"],
    category: "Productivity",
    status: "Prototype",
    demoUrl: "https://jamie.dev",
    repoUrl: "https://github.com/jamiel/portfolio",
    votes: 41,
    createdAt: "2026-07-23T08:00:00Z",
    updatedAt: "2026-07-26T08:00:00Z",
    thumbTone: "#A5A5A5",
    comments: [c("c13", "taylorm", "Week one and already shipping. Respect.", "4d", "celebration")],
  },
];

export const HALL_OF_FAME = [
  {
    week: 30,
    winner: "samdev",
    project: "AI Background Remover",
    votes: 512,
    prize: "$250 + Featured Slot",
    badge: "🏆 Champion W30",
    tone: "#A5A5A5",
  },
  {
    week: 29,
    winner: "kyles",
    project: "TypeForge",
    votes: 468,
    prize: "$250 + Featured Slot",
    badge: "🏆 Champion W29",
    tone: "#C08A6A",
  },
  {
    week: 28,
    winner: "alexbuilds",
    project: "ShipFast v1.0",
    votes: 441,
    prize: "$250 + Mentor Session",
    badge: "🏆 Champion W28",
    tone: "#7CFC00",
  },
  {
    week: 27,
    winner: "jj",
    project: "DevMatch Beta",
    votes: 402,
    prize: "$250 + Featured Slot",
    badge: "🏆 Champion W27",
    tone: "#7CFC00",
  },
  {
    week: 26,
    winner: "taylorm",
    project: "StudyHub Alpha",
    votes: 377,
    prize: "$250 + Mentor Session",
    badge: "🏆 Champion W26",
    tone: "#7CFC00",
  },
  {
    week: 25,
    winner: "morgank",
    project: "ShipNotes",
    votes: 341,
    prize: "$250 + Featured Slot",
    badge: "🏆 Champion W25",
    tone: "#A5A5A5",
  },
];

export const SEASON = {
  week: 31,
  year: 2026,
  startsAt: "2026-07-27T00:00:00Z",
  endsAt: "2026-08-03T00:00:00Z",
};

export const COMMUNITY_STATS = [
  { label: "Builders", value: 1284 },
  { label: "Projects Submitted", value: 3921 },
  { label: "Weekly Votes", value: 18740 },
  { label: "Projects Launched", value: 642 },
  { label: "Active This Week", value: 317 },
];

export const ACTIVITY_SEEDS = [
  "Jane submitted StudyHub",
  "Michael received 5 votes",
  "Sarah commented on DevBoard",
  "Daniel reached Rank #2",
  "Abigail launched Portfolio V2",
  "Alex Codes hit 450 weekly votes",
  "Kyle Shipz earned 🤝 Community Favorite",
  "Casey B. followed Sam Dev",
  "Morgan K. left feedback on ShipFast v2.0",
  "Jamie L. earned 🚀 First Launch",
];

export function builderBy(username: string) {
  return BUILDERS.find((b) => b.username === username);
}

export function projectsBy(username: string) {
  return PROJECTS.filter((p) => p.builder === username);
}

export function projectFor(username: string) {
  return PROJECTS.find((p) => p.builder === username);
}
// ---- live-data helpers (backend phase) ----


export const STATUSES = [
  { value: "shipped", label: "Shipped" },
  { value: "in_progress", label: "In Progress" },
  { value: "prototype", label: "Prototype" },
] as const;

export type ProjectStatus = (typeof STATUSES)[number]["value"];

export function statusLabel(value: string) {
  return STATUSES.find((s) => s.value === value)?.label ?? value;
}

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
