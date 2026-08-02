import { useEffect, useState } from "react";
import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { CATEGORIES, STATUSES } from "@/data/community";
import { saveProject } from "@/lib/app.functions";
import { myProjectsQuery } from "@/lib/db";
import { projectInputSchema } from "@/lib/validation";
import { uploadImage } from "@/lib/upload";
import { useStoredImage } from "@/lib/media";
import { useAuth } from "@/hooks/use-auth";

export const Route = createFileRoute("/_authenticated/submit")({
  validateSearch: (search: Record<string, unknown>): { id?: string } =>
    typeof search.id === "string" ? { id: search.id } : {},
  head: () => ({
    meta: [
      { title: "Submit a project — Leaderboard" },
      {
        name: "description",
        content:
          "Share what you're building with the LearnToEarn community and enter this week's race.",
      },
      { property: "og:title", content: "Submit a project — Leaderboard" },
      {
        property: "og:description",
        content: "Share what you're building and enter this week's race.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: SubmitPage,
});

const FIELD =
  "mt-2 w-full rounded-lg border border-border bg-background px-3.5 py-3 text-[14px] text-foreground outline-none transition-colors duration-200 focus:border-neon";

type FormState = {
  title: string;
  tagline: string;
  description: string;
  category: string;
  status: string;
  demoUrl: string;
  githubUrl: string;
  tech: string;
  published: boolean;
  thumbnailPath: string | null;
};

const EMPTY: FormState = {
  title: "",
  tagline: "",
  description: "",
  category: CATEGORIES[0] as string,
  status: "shipped",
  demoUrl: "",
  githubUrl: "",
  tech: "",
  published: true,
  thumbnailPath: null,
};

function SubmitPage() {
  const { id } = Route.useSearch();
  const { userId } = useAuth();
  const router = useRouter();
  const queryClient = useQueryClient();
  const run = useServerFn(saveProject);

  const { data: mine } = useQuery({
    ...myProjectsQuery(userId ?? ""),
    enabled: Boolean(userId),
  });
  const editing = id ? mine?.find((p) => p.id === id) : undefined;

  const [form, setForm] = useState<FormState>(EMPTY);
  const [uploading, setUploading] = useState(false);
  const thumb = useStoredImage("thumbnails", form.thumbnailPath);

  useEffect(() => {
    if (!editing) return;
    setForm({
      title: editing.title ?? "",
      tagline: editing.tagline ?? "",
      description: editing.description ?? "",
      category: editing.category ?? (CATEGORIES[0] as string),
      status: editing.status ?? "shipped",
      demoUrl: editing.demo_url ?? "",
      githubUrl: editing.github_url ?? "",
      tech: (editing.tech ?? []).join(", "),
      published: editing.published ?? true,
      thumbnailPath: editing.thumbnail_url ?? null,
    });
  }, [editing?.id]);

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  const mutation = useMutation({
    mutationFn: (input: unknown) => run({ data: input as never }),
    onSuccess: (project) => {
      queryClient.invalidateQueries({ queryKey: ["my-projects"] });
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      queryClient.invalidateQueries({ queryKey: ["activity"] });
      toast.success(id ? "Project updated" : "Project published");
      const slug = (project as { slug?: string } | null)?.slug;
      if (slug && form.published) router.navigate({ to: "/projects/$slug", params: { slug } });
      else router.navigate({ to: "/dashboard" });
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : "Could not save"),
  });

  async function pickThumbnail(file: File | undefined) {
    if (!file || !userId) return;
    setUploading(true);
    try {
      const path = await uploadImage("thumbnails", userId, file);
      set("thumbnailPath", path);
      toast.success("Thumbnail uploaded");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const parsed = projectInputSchema.safeParse({
      id,
      title: form.title,
      tagline: form.tagline,
      description: form.description,
      category: form.category,
      status: form.status,
      demoUrl: form.demoUrl,
      githubUrl: form.githubUrl,
      thumbnailPath: form.thumbnailPath,
      tech: form.tech
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean)
        .slice(0, 12),
      published: form.published,
    });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "Please check the form");
      return;
    }
    mutation.mutate(parsed.data);
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-14 sm:px-6 sm:py-20">
      <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
        {id ? "Edit project" : "Submit a project"}
      </h1>
      <p className="mt-3 max-w-xl text-[14px] leading-relaxed text-muted-foreground">
        Tell the community what you built. Clear beats clever — one honest sentence goes further
        than a wall of adjectives.
      </p>

      <form onSubmit={submit} className="mt-10 grid gap-6">
        <label className="block text-[12px] text-muted-foreground">
          Project name
          <input value={form.title} onChange={(e) => set("title", e.target.value)} className={FIELD} required />
        </label>

        <label className="block text-[12px] text-muted-foreground">
          Tagline
          <input
            value={form.tagline}
            onChange={(e) => set("tagline", e.target.value)}
            placeholder="One sentence on what it does"
            className={FIELD}
            required
          />
        </label>

        <label className="block text-[12px] text-muted-foreground">
          Description
          <textarea
            value={form.description}
            onChange={(e) => set("description", e.target.value)}
            rows={6}
            className={FIELD}
            required
          />
        </label>

        <div className="grid gap-6 sm:grid-cols-2">
          <label className="block text-[12px] text-muted-foreground">
            Category
            <select
              value={form.category}
              onChange={(e) => set("category", e.target.value)}
              className={FIELD}
            >
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-[12px] text-muted-foreground">
            Status
            <select
              value={form.status}
              onChange={(e) => set("status", e.target.value)}
              className={FIELD}
            >
              {STATUSES.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-[12px] text-muted-foreground">
            Live demo URL
            <input
              value={form.demoUrl}
              onChange={(e) => set("demoUrl", e.target.value)}
              inputMode="url"
              placeholder="https://"
              className={FIELD}
            />
          </label>
          <label className="block text-[12px] text-muted-foreground">
            Repository URL
            <input
              value={form.githubUrl}
              onChange={(e) => set("githubUrl", e.target.value)}
              inputMode="url"
              placeholder="https://"
              className={FIELD}
            />
          </label>
        </div>

        <label className="block text-[12px] text-muted-foreground">
          Tech stack (comma separated)
          <input
            value={form.tech}
            onChange={(e) => set("tech", e.target.value)}
            placeholder="React, Postgres, Tailwind"
            className={FIELD}
          />
        </label>

        <div className="rounded-lg border border-border p-4 sm:p-5">
          <div className="text-[13px] font-medium">Thumbnail</div>
          <p className="mt-1 text-[12px] text-muted-foreground">
            Images are resized and re-encoded before upload, and served through secure links.
          </p>
          {thumb ? (
            <img
              src={thumb}
              alt="Project thumbnail preview"
              className="mt-4 aspect-[16/7] w-full rounded-md object-cover"
            />
          ) : null}
          <input
            type="file"
            accept="image/*"
            onChange={(e) => pickThumbnail(e.target.files?.[0])}
            className="mt-4 block w-full text-[12px] text-muted-foreground file:mr-3 file:min-h-11 file:rounded-full file:border file:border-border file:bg-background file:px-4 file:text-[13px]"
          />
          {uploading ? <div className="mt-2 text-[12px] text-muted-foreground">Uploading…</div> : null}
        </div>

        <label className="flex min-h-11 items-center gap-3 text-[13px] text-muted-foreground">
          <input
            type="checkbox"
            checked={form.published}
            onChange={(e) => set("published", e.target.checked)}
            className="size-4 accent-[var(--neon)]"
          />
          Publish to the showcase (uncheck to keep it as a private draft)
        </label>

        <div className="flex flex-wrap gap-3">
          <button
            type="submit"
            disabled={mutation.isPending || uploading}
            className="min-h-12 rounded-full bg-foreground px-6 text-[14px] font-medium text-background transition-colors duration-200 hover:bg-foreground/90 disabled:opacity-60"
          >
            {mutation.isPending ? "Saving…" : id ? "Save changes" : "Publish project"}
          </button>
          <button
            type="button"
            onClick={() => router.navigate({ to: "/dashboard" })}
            className="min-h-12 rounded-full border border-border px-6 text-[14px] transition-colors duration-200 hover:border-neon"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
