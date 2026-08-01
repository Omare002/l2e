import { useQueries, useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { qk } from "@/lib/db";

const ONE_HOUR = 3600;

async function sign(bucket: string, path: string) {
  const { data, error } = await supabase.storage.from(bucket).createSignedUrl(path, ONE_HOUR);
  if (error) return null;
  return data?.signedUrl ?? null;
}

function options(bucket: string, path: string | null | undefined) {
  return {
    queryKey: qk.signedUrl(bucket, path ?? "none"),
    queryFn: () => sign(bucket, path!),
    enabled: Boolean(path),
    staleTime: (ONE_HOUR - 300) * 1000,
    gcTime: ONE_HOUR * 1000,
  };
}

/** Resolves a stored storage path into a temporary, secure URL. */
export function useStoredImage(bucket: "avatars" | "thumbnails", path: string | null | undefined) {
  const { data } = useQuery(options(bucket, path));
  return data ?? null;
}

export function useStoredImages(
  bucket: "avatars" | "thumbnails",
  paths: (string | null | undefined)[],
) {
  const results = useQueries({ queries: paths.map((p) => options(bucket, p)) });
  const map: Record<string, string> = {};
  paths.forEach((p, i) => {
    const url = results[i]?.data;
    if (p && url) map[p] = url;
  });
  return map;
}
