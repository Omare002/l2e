import { supabase } from "@/integrations/supabase/client";
import type { StorageBucket } from "@/lib/media";

const MAX_BYTES = 5 * 1024 * 1024;
const MAX_EDGE = 1400;
export const ACCEPTED_IMAGE_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
export const ACCEPT_ATTRIBUTE = ".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp";

/** Throws a friendly message when a picked file isn't a supported, reasonably sized image. */
export function validateImageFile(file: File) {
  if (!ACCEPTED_IMAGE_TYPES.includes(file.type.toLowerCase())) {
    throw new Error("Use a JPG, PNG or WebP image");
  }
  if (file.size > MAX_BYTES) throw new Error("Images must be smaller than 5MB");
}

/** Downscales and re-encodes an image in the browser before upload. */
async function optimize(file: File): Promise<Blob> {
  validateImageFile(file);
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

async function put(bucket: StorageBucket, userId: string, blob: Blob) {
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

export async function uploadImage(
  bucket: StorageBucket,
  userId: string,
  file: File,
): Promise<string> {
  return put(bucket, userId, await optimize(file));
}

/** Uploads an already-cropped square avatar blob. */
export async function uploadAvatarBlob(userId: string, blob: Blob): Promise<string> {
  return put("avatars", userId, blob);
}
