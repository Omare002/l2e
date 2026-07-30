import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { CATEGORIES } from "@/data/community";

export const Route = createFileRoute("/submit")({
  head: () => ({
    meta: [
      { title: "Submit a Project — Leaderboard" },
      {
        name: "description",
        content:
          "Share what you're building with the LearnToEarn community and enter this week's race.",
      },
      { property: "og:title", content: "Submit a Project — Leaderboard" },
      {
        property: "og:description",
        content: "Share what you're building and enter this week's race.",
      },
    ],
  }),
  component: SubmitPage,
});

const field =
  "w-full border border-border bg-background px-3 py-2.5 font-mono text-[13px] outline-none focus:border-neon";
const label = "font-mono text-[11px] tracking-normal text-muted-foreground";

function SubmitPage() {
  const [done, setDone] = useState(false);
  const [name, setName] = useState("");

  if (done) {
    return (
      <div className="mx-auto max-w-2xl px-5 py-24 text-center">
        <div className="text-4xl">🚀</div>
        <h1 className="mt-6 font-mono text-3xl font-semibold">
          {name || "Your project"} is in the race
        </h1>
        <p className="mt-4 font-mono text-[13px] text-muted-foreground">
          Your car has joined the track at the back of the grid. Every upvote from here
          moves you forward until the season ends on Monday.
        </p>
        <button
          onClick={() => setDone(false)}
          className="mt-8 bg-ink px-5 py-3 font-mono text-[12px] font-bold text-background"
        >
          Submit another
        </button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-6 py-16">
      <h1 className="font-mono text-4xl font-semibold sm:text-5xl">
        Submit a <span className="text-neon">Project</span>
      </h1>
      <p className="mt-4 font-mono text-[13px] text-muted-foreground">
        Unfinished is fine. Shipping something small beats polishing something invisible.
      </p>

      <form
        className="mt-10 space-y-6"
        onSubmit={(e) => {
          e.preventDefault();
          setDone(true);
        }}
      >
        <div className="grid gap-6 sm:grid-cols-2">
          <div>
            <label className={label}>Project Name</label>
            <input
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className={`mt-2 ${field}`}
              placeholder="StudyHub"
            />
          </div>
          <div>
            <label className={label}>Tagline</label>
            <input required className={`mt-2 ${field}`} placeholder="One sentence, no buzzwords" />
          </div>
        </div>

        <div>
          <label className={label}>Description</label>
          <textarea
            required
            rows={5}
            className={`mt-2 ${field}`}
            placeholder="What did you build, why, and what did you learn?"
          />
        </div>

        <div className="grid gap-6 sm:grid-cols-2">
          <div>
            <label className={label}>Thumbnail</label>
            <input type="file" className={`mt-2 ${field}`} />
          </div>
          <div>
            <label className={label}>Screenshots</label>
            <input type="file" multiple className={`mt-2 ${field}`} />
          </div>
          <div>
            <label className={label}>Demo URL</label>
            <input className={`mt-2 ${field}`} placeholder="https://" />
          </div>
          <div>
            <label className={label}>GitHub Repository</label>
            <input className={`mt-2 ${field}`} placeholder="https://github.com/" />
          </div>
          <div>
            <label className={label}>Tech Stack</label>
            <input className={`mt-2 ${field}`} placeholder="React, Supabase, Tailwind" />
          </div>
          <div>
            <label className={label}>Category</label>
            <select className={`mt-2 ${field}`}>
              {CATEGORIES.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
          </div>
          <div>
            <label className={label}>Development Status</label>
            <select className={`mt-2 ${field}`}>
              <option>Shipped</option>
              <option>In Progress</option>
              <option>Prototype</option>
            </select>
          </div>
          <div>
            <label className={label}>Expected Launch Date</label>
            <input type="date" className={`mt-2 ${field}`} />
          </div>
        </div>

        <button className="bg-neon px-6 py-3 font-mono text-[13px] font-bold text-ink">
          Enter the race
        </button>

        <p className="font-mono text-[11px] text-muted-foreground">
          Sign in with Google, GitHub or Discord is coming with the backend phase — for now
          submissions stay on this device.
        </p>
      </form>
    </div>
  );
}