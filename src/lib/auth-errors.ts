/** Turns provider/backend auth errors into calm, human wording. Never leaks internals. */
export function friendlyAuthError(error: unknown, fallback = "Something went wrong. Please try again."): string {
  const raw = (error instanceof Error ? error.message : String(error ?? "")).toLowerCase();
  if (!raw) return fallback;

  if (raw.includes("invalid login credentials")) return "That email and password don't match.";
  if (raw.includes("email not confirmed")) return "Confirm your email first — check your inbox for the link.";
  if (raw.includes("user already registered") || raw.includes("already been registered")) {
    return "An account already uses that email. Try signing in instead.";
  }
  if (raw.includes("password") && raw.includes("least")) return "Use a longer password — at least 8 characters.";
  if (raw.includes("pwned") || raw.includes("compromised")) {
    return "That password has appeared in a data breach. Please pick another.";
  }
  if (raw.includes("rate limit") || raw.includes("too many")) {
    return "Too many attempts. Please wait a minute and try again.";
  }
  if (raw.includes("unsupported provider") || raw.includes("provider is not enabled")) {
    return "That sign-in method isn't available yet.";
  }
  if (raw.includes("popup") || raw.includes("cancel") || raw.includes("closed")) {
    return "Sign-in was cancelled.";
  }
  if (raw.includes("network") || raw.includes("failed to fetch")) {
    return "Network problem — check your connection and try again.";
  }
  if (raw.includes("invalid email") || raw.includes("valid email")) return "Enter a valid email address.";
  if (raw.includes("token") || raw.includes("expired")) return "That link has expired. Please request a new one.";
  return fallback;
}
