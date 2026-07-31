// The URI Instagram itself redirects to. It cannot vary by caller: the Meta app
// has strict redirect-URI matching enabled, so this exact string is the only one
// Instagram accepts. A flow started on localhost therefore also lands on
// production, which is why the callback separately remembers where to send the
// browser afterwards -- see instagramReturnOrigin.
export const INSTAGRAM_PRODUCTION_ORIGIN = "https://linkzip.kr";
export const INSTAGRAM_REDIRECT_URI = `${INSTAGRAM_PRODUCTION_ORIGIN}/auth/instagram/callback`;

/**
 * Resolves where the browser should be sent once the OAuth callback is done.
 *
 * Whitelisted rather than echoed back: the caller controls this value, and an
 * unchecked one would turn the callback into an open redirect carrying the
 * `code` query parameter to whatever host an attacker named.
 */
export function instagramReturnOrigin(value: unknown): string {
  if (typeof value !== "string" || !value) return INSTAGRAM_PRODUCTION_ORIGIN;
  if (value === INSTAGRAM_PRODUCTION_ORIGIN) return value;

  let parsed: URL;
  try {
    parsed = new URL(value);
  } catch {
    return INSTAGRAM_PRODUCTION_ORIGIN;
  }

  // Local development only. Without this the developer always ends up on
  // production, signed out, and is bounced to the landing page by the protected
  // route -- so the connect flow can never be finished (or recorded) locally.
  const isLoopback = parsed.hostname === "localhost" || parsed.hostname === "127.0.0.1";
  // `parsed.origin === value` rejects anything carrying a path, query or
  // fragment, so the caller cannot append to the URL we build from it.
  if (parsed.protocol === "http:" && isLoopback && parsed.origin === value) return value;

  return INSTAGRAM_PRODUCTION_ORIGIN;
}
