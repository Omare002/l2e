import { supabase } from "@/integrations/supabase/client";

const MAX_BYTES = 5 * 1024 * 1024;
const MAX_EDGE = 1400;

/** Downscales and re-encodes an image in the browser before upload. */
async function optimize(file: File): Promise<Blob> {
  if (!file.type.startsWith("image/")) throw new Error("Please choose an image file");
  if (file.size > MAX_BYTES) throw new Error("Images must be smaller than 5MB");
  if (typeof document === "undefined") return file;

  const bitmap = await createImageBitmap(file).catch(() => null);
  if (!bitmap) return file;

  const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  const ctx = canvas.getContext("2d");
  if (!ctx) return file;
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close?.();

  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob((b) => resolve(b), "image/webp", 0.85),
  );
  return blob ?? file;
}

export async function uploadImage(
  bucket: "avatars" | "thumbnails",
  userId: string,
  file: File,
): Promise<string> {
  const blob = await optimize(file);
  const path = `${userId}/${crypto.randomUUID()}.webp`;
  const { error } = await supabase.storage.from(bucket).upload(path, blob, {
    contentType: blob.type || "image/webp",
    upsert: false,
  });
  if (error) {
    console.error("[upload]", error.message);
    throw new Error("Upload failed. Please try again.");
  }
  return path;
}
