/**
 * Base URL of the AI Mentor API, inlined at build time from EXPO_PUBLIC_API_URL.
 * Optional: without it the chat shows "not connected" and the rest of the app works.
 * Only https is accepted, except plain http for a local development server.
 */
const LOCAL_HTTP = /^http:\/\/(localhost|127\.0\.0\.1|10\.0\.2\.2)(:\d{1,5})?$/;

export function parseApiBaseUrl(raw: string | undefined): string | null {
  const value = raw?.trim().replace(/\/+$/, '') ?? '';
  if (!value) return null;
  if (LOCAL_HTTP.test(value)) return value;
  try {
    const url = new URL(value);
    if (url.protocol !== 'https:' || url.username || url.password || url.search || url.hash) {
      return null;
    }
    return value;
  } catch {
    return null;
  }
}

/** Expo inlines `process.env.EXPO_PUBLIC_*` only for static property access. */
export const apiBaseUrl: string | null = parseApiBaseUrl(process.env.EXPO_PUBLIC_API_URL);
