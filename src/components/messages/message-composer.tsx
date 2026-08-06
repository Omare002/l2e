import { useRef, useState } from "react";
import { ImagePlus, Send, Smile, X } from "lucide-react";
import { toast } from "sonner";
import { ACCEPT_ATTRIBUTE, uploadImage } from "@/lib/upload";

const EMOJI = ["🙌", "🔥", "✅", "🚀", "👀", "💡", "🙏", "😄", "🤝", "❤️", "🎉", "🐛"];

type Props = {
  disabled?: boolean;
  placeholder?: string;
  userId: string;
  sending: boolean;
  onTyping?: () => void;
  onSend: (payload: { body: string; imagePath: string | null }) => Promise<void> | void;
};

/** Chat composer: text, emoji, drag-and-drop or picked image, Enter to send. */
export function MessageComposer({
  disabled,
  placeholder = "Write a message…",
  userId,
  sending,
  onTyping,
  onSend,
}: Props) {
  const [body, setBody] = useState("");
  const [emojiOpen, setEmojiOpen] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [pending, setPending] = useState<{ path: string; name: string } | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const areaRef = useRef<HTMLTextAreaElement>(null);

  async function attach(file: File | undefined) {
    if (!file) return;
    setUploading(true);
    try {
      const path = await uploadImage("message-images", userId, file);
      setPending({ path, name: file.name });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  async function submit() {
    const text = body.trim();
    if (disabled || sending || (!text && !pending)) return;
    await onSend({ body: text, imagePath: pending?.path ?? null });
    setBody("");
    setPending(null);
    setEmojiOpen(false);
    areaRef.current?.focus();
  }

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragging(false);
        void attach(e.dataTransfer.files?.[0]);
      }}
      className={`border-t border-border bg-background px-3 py-3 transition-colors duration-200 sm:px-4 ${
        dragging ? "border-neon bg-neon-dim/30" : ""
      }`}
    >
      {pending ? (
        <div className="mb-2 inline-flex max-w-full items-center gap-2 rounded-full border border-border px-3 py-1.5 text-[12px]">
          <span className="truncate">{pending.name}</span>
          <button
            type="button"
            aria-label="Remove attachment"
            onClick={() => setPending(null)}
            className="text-muted-foreground transition-colors duration-200 hover:text-foreground"
          >
            <X className="size-3.5" />
          </button>
        </div>
      ) : null}

      {emojiOpen ? (
        <div className="mb-2 flex flex-wrap gap-1 rounded-lg border border-border p-2">
          {EMOJI.map((e) => (
            <button
              key={e}
              type="button"
              onClick={() => setBody((b) => `${b}${e}`)}
              className="flex size-9 items-center justify-center rounded-md text-[16px] transition-colors duration-200 hover:bg-muted"
            >
              {e}
            </button>
          ))}
        </div>
      ) : null}

      <div className="flex items-end gap-2">
        <button
          type="button"
          onClick={() => setEmojiOpen((o) => !o)}
          aria-label="Emoji"
          className="flex size-10 shrink-0 items-center justify-center rounded-full border border-border text-muted-foreground transition-colors duration-200 hover:border-neon hover:text-foreground"
        >
          <Smile className="size-4" />
        </button>
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          aria-label="Attach image"
          disabled={uploading}
          className="flex size-10 shrink-0 items-center justify-center rounded-full border border-border text-muted-foreground transition-colors duration-200 hover:border-neon hover:text-foreground disabled:opacity-50"
        >
          <ImagePlus className="size-4" />
        </button>
        <input
          ref={fileRef}
          type="file"
          accept={ACCEPT_ATTRIBUTE}
          className="hidden"
          onChange={(e) => {
            void attach(e.target.files?.[0] ?? undefined);
            e.target.value = "";
          }}
        />

        <textarea
          ref={areaRef}
          value={body}
          rows={1}
          disabled={disabled}
          onChange={(e) => {
            setBody(e.target.value);
            onTyping?.();
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              void submit();
            }
          }}
          placeholder={placeholder}
          className="max-h-32 min-h-10 flex-1 resize-none rounded-2xl border border-border bg-background px-4 py-2.5 text-[13.5px] leading-relaxed outline-none transition-colors duration-200 placeholder:text-muted-foreground focus:border-neon disabled:opacity-60"
        />

        <button
          type="button"
          onClick={() => void submit()}
          disabled={disabled || sending || (!body.trim() && !pending)}
          aria-label="Send message"
          className="flex size-10 shrink-0 items-center justify-center rounded-full bg-foreground text-background transition-opacity duration-200 hover:opacity-90 disabled:opacity-40"
        >
          <Send className="size-4" />
        </button>
      </div>
      <p className="mt-1.5 hidden pl-1 text-[11px] text-muted-foreground sm:block">
        Enter to send · Shift+Enter for a new line · **bold**, `code`, ```blocks``` supported
      </p>
    </div>
  );
}
