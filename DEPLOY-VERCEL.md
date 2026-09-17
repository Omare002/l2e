# Deploying Leaderboard to Vercel

This app is a full-stack TanStack Start app: it renders pages on the server and
runs its own server functions (auth-protected reads/writes, push config, quest
and messaging logic). It cannot be hosted as a plain static site — that is what
caused the "some pages 404" behaviour, because Vercel's Vite preset publishes
only the static `dist/` folder and drops the server handler.

## 1. Project settings

`vercel.json` (in the repo) already pins the correct setup:

- Framework preset: **Other** (`"framework": null`)
- Build command: `NITRO_PRESET=vercel npm run build`
- Output: leave **Output Directory empty** in the Vercel dashboard.
  The build writes Vercel's Build Output API folder `.vercel/output`, which
  Vercel picks up automatically and which contains both the static assets and
  the SSR/server-function function.

If the project was already created in Vercel with the "Vite" framework preset,
change it to **Other** in Settings → Build & Development Settings, clear any
Output Directory override, and redeploy. Do not add rewrites to `index.html`.

## 2. Environment variables

Add these in Vercel → Settings → Environment Variables for **Production**,
**Preview** and **Development** (values are the same ones this project already
uses; the `VITE_`-prefixed ones are public by design):

| Variable | Purpose |
| --- | --- |
| `VITE_SUPABASE_URL` | backend URL (browser) |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | backend publishable key (browser) |
| `VITE_SUPABASE_PROJECT_ID` | backend project id (browser) |
| `SUPABASE_URL` | backend URL (server functions) |
| `SUPABASE_PUBLISHABLE_KEY` | backend publishable key (server functions) |
| `SUPABASE_PROJECT_ID` | backend project id (server functions) |
| `VITE_VAPID_PUBLIC_KEY` | web-push public key (browser) |
| `VAPID_PUBLIC_KEY` | web-push public key (server) |

The server-side variables are required: without `SUPABASE_URL` /
`SUPABASE_PUBLISHABLE_KEY`, every signed-in feature (dashboard, submit, quests,
messages, moderation) fails on Vercel even though the public pages render.

## 3. Auth redirect URLs

Add the Vercel domain(s) to the backend auth settings as allowed redirect URLs,
otherwise sign-in and password reset bounce back to the wrong origin:

- `https://<your-app>.vercel.app`
- `https://<your-app>.vercel.app/**`
- plus any custom domain you attach

## 4. Things that stay on the backend

Database, storage, realtime and the `send-push` function keep running on the
existing backend regardless of where the frontend is hosted — no migration
needed, and no data is affected by moving hosting.
