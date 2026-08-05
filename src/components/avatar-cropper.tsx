import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Slider } from "@/components/ui/slider";

const BOX = 264;
const OUTPUT = 512;

type Props = {
  file: File | null;
  onCancel: () => void;
  onConfirm: (blob: Blob) => void | Promise<void>;
  busy?: boolean;
};

/** Square-crop dialog: drag to reposition, slide to zoom, exports an optimized WebP. */
export function AvatarCropper({ file, onCancel, onConfirm, busy }: Props) {
  const objectUrl = useMemo(() => (file ? URL.createObjectURL(file) : null), [file]);
  const [image, setImage] = useState<HTMLImageElement | null>(null);
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const drag = useRef<{ x: number; y: number; ox: number; oy: number } | null>(null);

  useEffect(() => {
    if (!objectUrl) return;
    const img = new Image();
    img.onload = () => {
      setImage(img);
      setZoom(1);
      setOffset({ x: 0, y: 0 });
    };
    img.src = objectUrl;
    return () => URL.revokeObjectURL(objectUrl);
  }, [objectUrl]);

  const base = image ? BOX / Math.min(image.naturalWidth, image.naturalHeight) : 1;
  const scale = base * zoom;
  const drawW = image ? image.naturalWidth * scale : BOX;
  const drawH = image ? image.naturalHeight * scale : BOX;

  const clamp = useCallback(
    (x: number, y: number) => ({
      x: Math.min(0, Math.max(BOX - drawW, x)),
      y: Math.min(0, Math.max(BOX - drawH, y)),
    }),
    [drawW, drawH],
  );

  useEffect(() => {
    setOffset((o) => clamp(o.x, o.y));
  }, [clamp]);

  function onPointerDown(e: React.PointerEvent) {
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    drag.current = { x: e.clientX, y: e.clientY, ox: offset.x, oy: offset.y };
  }
  function onPointerMove(e: React.PointerEvent) {
    const d = drag.current;
    if (!d) return;
    setOffset(clamp(d.ox + (e.clientX - d.x), d.oy + (e.clientY - d.y)));
  }
  function onPointerUp() {
    drag.current = null;
  }

  async function confirm() {
    if (!image) return;
    const canvas = document.createElement("canvas");
    canvas.width = OUTPUT;
    canvas.height = OUTPUT;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const sourceSize = BOX / scale;
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(
      image,
      -offset.x / scale,
      -offset.y / scale,
      sourceSize,
      sourceSize,
      0,
      0,
      OUTPUT,
      OUTPUT,
    );
    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob((b) => resolve(b), "image/webp", 0.88),
    );
    if (blob) await onConfirm(blob);
  }

  return (
    <Dialog open={Boolean(file)} onOpenChange={(open) => (!open && !busy ? onCancel() : undefined)}>
      <DialogContent className="max-w-[340px]">
        <DialogHeader>
          <DialogTitle className="text-[15px] font-semibold tracking-tight">
            Position your photo
          </DialogTitle>
        </DialogHeader>

        <div
          className="relative mx-auto touch-none overflow-hidden rounded-full border border-border bg-muted"
          style={{ width: BOX, height: BOX }}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
        >
          {objectUrl ? (
            <img
              src={objectUrl}
              alt=""
              draggable={false}
              className="absolute origin-top-left select-none will-change-transform"
              style={{
                width: drawW,
                height: drawH,
                transform: `translate3d(${offset.x}px, ${offset.y}px, 0)`,
                cursor: "grab",
              }}
            />
          ) : null}
        </div>

        <div className="mt-1 flex items-center gap-3">
          <span className="font-mono text-[11px] text-muted-foreground">Zoom</span>
          <Slider
            value={[zoom]}
            min={1}
            max={3}
            step={0.01}
            onValueChange={(v) => setZoom(v[0] ?? 1)}
            className="flex-1"
          />
        </div>

        <div className="mt-3 flex justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            disabled={busy}
            className="min-h-10 rounded-full border border-border px-4 text-[13px] transition-colors duration-200 hover:bg-muted/60 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={confirm}
            disabled={busy || !image}
            className="min-h-10 rounded-full bg-foreground px-4 text-[13px] font-medium text-background transition-opacity duration-200 hover:opacity-90 disabled:opacity-50"
          >
            {busy ? "Uploading…" : "Use photo"}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
