import { useRef, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { AvatarCropper } from "@/components/avatar-cropper";
import { UserAvatar } from "@/components/user-avatar";
import { saveAvatar } from "@/lib/app.functions";
import { ACCEPT_ATTRIBUTE, uploadAvatarBlob, validateImageFile } from "@/lib/upload";

type Props = {
  userId: string;
  name: string | null | undefined;
  path: string | null | undefined;
  accent?: string | null;
  size?: number;
};

/** Upload, replace or remove the signed-in user's profile photo. */
export function AvatarPicker({ userId, name, path, accent, size = 64 }: Props) {
  const input = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const queryClient = useQueryClient();
  const runSaveAvatar = useServerFn(saveAvatar);

  const mutation = useMutation({
    mutationFn: (avatarPath: string | null) => runSaveAvatar({ data: { avatarPath } as never }),
    onSuccess: () => {
      // Every avatar surface reads from these caches, so the photo swaps in without a refresh.
      queryClient.invalidateQueries({ queryKey: ["my-profile"] });
      queryClient.invalidateQueries({ queryKey: ["profile"] });
      queryClient.invalidateQueries({ queryKey: ["leaderboard"] });
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      queryClient.invalidateQueries({ queryKey: ["project"] });
      queryClient.invalidateQueries({ queryKey: ["my-projects"] });
      queryClient.invalidateQueries({ queryKey: ["comments"] });
      queryClient.invalidateQueries({ queryKey: ["discussions"] });
      queryClient.invalidateQueries({ queryKey: ["discussion-replies"] });
      queryClient.invalidateQueries({ queryKey: ["activity"] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Could not update your photo"),
  });

  function pick(next: File | undefined) {
    if (!next) return;
    try {
      validateImageFile(next);
      setFile(next);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Unsupported image");
    } finally {
      if (input.current) input.current.value = "";
    }
  }

  async function upload(blob: Blob) {
    try {
      const uploaded = await uploadAvatarBlob(userId, blob);
      await mutation.mutateAsync(uploaded);
      setFile(null);
      toast.success("Profile photo updated");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Upload failed");
    }
  }

  const busy = mutation.isPending;

  return (
    <div className="flex items-center gap-4">
      <button
        type="button"
        onClick={() => input.current?.click()}
        className="rounded-full outline-none ring-offset-2 ring-offset-background transition-shadow duration-200 hover:ring-2 hover:ring-neon focus-visible:ring-2 focus-visible:ring-neon"
        aria-label="Change profile photo"
      >
        <UserAvatar name={name} path={path} accent={accent} size={size} eager />
      </button>

      <div className="flex flex-col gap-1.5">
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => input.current?.click()}
            disabled={busy}
            className="min-h-9 rounded-full border border-border px-3.5 text-[12px] transition-colors duration-200 hover:border-neon hover:bg-muted/60 disabled:opacity-50"
          >
            {path ? "Change photo" : "Upload photo"}
          </button>
          {path ? (
            <button
              type="button"
              onClick={() => mutation.mutate(null)}
              disabled={busy}
              className="min-h-9 rounded-full border border-border px-3.5 text-[12px] text-muted-foreground transition-colors duration-200 hover:border-destructive hover:text-destructive disabled:opacity-50"
            >
              Remove
            </button>
          ) : null}
        </div>
        <span className="font-mono text-[11px] text-muted-foreground">
          JPG, PNG or WebP · up to 5MB
        </span>
      </div>

      <input
        ref={input}
        type="file"
        accept={ACCEPT_ATTRIBUTE}
        className="hidden"
        onChange={(e) => pick(e.target.files?.[0])}
      />

      <AvatarCropper file={file} busy={busy} onCancel={() => setFile(null)} onConfirm={upload} />
    </div>
  );
}
