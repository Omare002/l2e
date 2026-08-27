-- ============================================================
-- Security fix: avatars, thumbnails, and message-images all rely on
-- client-side checks (src/lib/upload.ts: validateImageFile) for file type
-- and the 5MB size limit. Nothing enforced that server-side — a request
-- made directly against the Storage API with a valid JWT (bypassing the
-- web app entirely) could upload an arbitrary file type or size.
--
-- avatars/thumbnails are publicly readable (see the "Public read of..."
-- policies), so an unrestricted upload there is a stored-content risk,
-- not just a quota one: an uploaded .html or .svg with an embedded
-- <script>, served back with its own content-type, executes in the
-- storage domain's origin if someone opens the file's public URL
-- directly.
--
-- This only sets file_size_limit and allowed_mime_types on buckets that
-- already exist (a no-op UPDATE if a bucket id doesn't exist yet) and
-- deliberately does not touch the `public` flag, since guessing that
-- wrong could change who can read existing files.
-- ============================================================

UPDATE storage.buckets
SET file_size_limit = 5242880, -- 5MB, matching src/lib/upload.ts
    allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp']
WHERE id IN ('avatars', 'thumbnails', 'message-images');
