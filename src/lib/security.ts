const DEFAULT_AUTH_REDIRECT = "/dashboard";

type RateLimitState = {
  count: number;
  resetAt: number;
};

export type RateLimitDecision = {
  allowed: boolean;
  remaining: number;
  retryAfterMs: number;
};

export function sanitizeNextPath(
  nextPath: string | null | undefined,
  fallback: string = DEFAULT_AUTH_REDIRECT
): string {
  if (!nextPath) return fallback;

  if (!nextPath.startsWith("/")) return fallback;
  if (nextPath.startsWith("//")) return fallback;
  if (nextPath.includes("://")) return fallback;

  return nextPath;
}

export function parseAdminEmails(raw: string | undefined): Set<string> {
  if (!raw) return new Set<string>();

  const emails = raw
    .split(",")
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean);

  return new Set(emails);
}

export function isAdminEmail(
  email: string | undefined | null,
  adminEmails: Set<string>
): boolean {
  if (!email) return false;
  return adminEmails.has(email.trim().toLowerCase());
}

export function createRateLimiter(maxRequests: number, windowMs: number) {
  const store = new Map<string, RateLimitState>();

  return {
    consume(key: string): RateLimitDecision {
      const now = Date.now();
      const current = store.get(key);

      if (!current || current.resetAt <= now) {
        store.set(key, { count: 1, resetAt: now + windowMs });
        return {
          allowed: true,
          remaining: Math.max(maxRequests - 1, 0),
          retryAfterMs: windowMs,
        };
      }

      if (current.count >= maxRequests) {
        return {
          allowed: false,
          remaining: 0,
          retryAfterMs: Math.max(current.resetAt - now, 0),
        };
      }

      current.count += 1;
      store.set(key, current);

      return {
        allowed: true,
        remaining: Math.max(maxRequests - current.count, 0),
        retryAfterMs: Math.max(current.resetAt - now, 0),
      };
    },
  };
}
