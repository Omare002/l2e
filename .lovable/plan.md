## Leaderboard — Phase 1 (front-end showcase)

Build the full experience with realistic demo data, matching the inspiration exactly. Backend (Cloud auth, database, realtime) comes in Phase 2.

### Design system
- Background `#F7F7F5`, black `#111111`, neon green `#7CFC00`, dark card `#171717`, gray `#A5A5A5` — all as semantic tokens in `src/styles.css` (oklch).
- JetBrains Mono as the primary face, IBM Plex Mono for body copy, loaded via `<link>` in the root route.
- Sharp corners (radius 0), thin 1px borders, heavy uppercase headlines, generous whitespace, pixel-style badges.
- Shared chrome in `__root.tsx`: minimal nav (dot + BUILDRACE-style wordmark, Feed / Leaderboard / How it works) and a green "Submit Project" button; minimal single-line footer.

### Routes
```
/                 hero + stats + live race + latest projects
/projects         discover grid with sorting
/projects/$slug   project detail: screenshots, tech, links, comments
/leaderboard      full race track + standings table + season countdown
/hall-of-fame     past weekly champions
/builders/$user   builder profile
/submit           project submission form (multi-step, local only in phase 1)
/dashboard        member view: my projects, votes, comments, achievements
/how-it-works     rules, scoring, badges
```

### Home page
1. Hero: `BUILD. / SHARE. / CLIMB.` in huge mono caps with the third line in neon green, subtitle, two sharp buttons (Explore Projects, Submit Project), week pill above.
2. Live stats strip: Builders, Projects Submitted, Weekly Votes, Projects Launched, Active This Week — count-up animation on mount.
3. Live Race Track (hero feature).
4. Latest Builds grid with Trending / New toggle.

### Live Race Track
Dark `#171717` panel, checkered start line, dashed lanes per builder, finish line at right.
- Left column: rank, avatar, username, project name; right: votes and distance-to-finish.
- Car position = builder's weekly votes ÷ current weekly leader's votes (weekly votes only, resets each season).
- Framer Motion spring transitions for movement, lane-swap animations on overtake, CSS tire-smoke puff and speed lines when a car accelerates, glow + confetti when a car takes P1.
- Phase 1 simulates live vote drips on a timer so the race visibly moves; Phase 2 swaps the data source for realtime without touching the component.

### Projects
Dark cards: thumbnail, name, builder, tagline, tech chips, category, rank badge, vote button, comment count, demo/GitHub links. Hover: lift, neon border, soft shadow.
Sorting: Trending, Newest, Most Voted, Most Commented, Recently Updated. Category and status filters.
Detail page adds screenshots gallery, full description, threaded feedback comments, follow-builder button.

### Season, Hall of Fame, profiles, achievements
- Season banner: week number, start/end, live countdown, current top 3.
- Hall of Fame: archived weeks with winner, project, votes, screenshot, prize, badge.
- Profiles: photo, bio, skills, projects, weekly rank, total votes, achievements, GitHub/LinkedIn/portfolio, followers, recent activity, contribution calendar grid.
- Achievement badge set (First Launch, On Fire, Weekly Champion, Most Innovative, Community Favorite, Fast Builder, Consistent Builder, Most Helpful Reviewer) as pixel-style tiles.
- Community feed component with auto-appending activity lines.

### Submission + dashboard
Submit form with all requested fields, validated with react-hook-form + zod, stored in local state for now with a success screen. Dashboard shows my projects, vote/comment stats, leaderboard position, achievements, profile edit.

### Technical notes
- TanStack Start + React + TypeScript + Tailwind v4 (this project's stack; equivalent to the Next.js request), Framer Motion for animation, `canvas-confetti` for celebrations.
- Demo data lives in `src/data/*.ts` behind small hooks (`useRace`, `useProjects`), so Phase 2 swaps them for Cloud queries with no UI rewrite.
- Generated project thumbnails/screenshots and avatars in `src/assets`.
- Per-route `head()` metadata for SEO.

### Phase 2 (after you approve Phase 1)
Enable Lovable Cloud: Google/GitHub/Discord auth, tables for profiles, projects, votes, comments, seasons, achievements, follows; RLS + grants; realtime vote subscription driving the race; storage for thumbnails; admin panel (approve, feature, moderate, reset seasons, analytics) gated by a separate `user_roles` table. You'll be assigned the first admin role then.
