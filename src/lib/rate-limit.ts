/**
 * Sliding-window limiter kept in memory. On serverless it is per instance, which
 * is enough to stop casual abuse of a contact form; use a shared store (e.g. Upstash)
 * if the site ever needs a hard global limit.
 */
const hits = new Map<string, number[]>();

/** `record: false` only checks; count the event later with `recordHit` (e.g. only once it succeeded). */
export function rateLimit(key: string, limit: number, windowMs: number, { record = true } = {}) {
  const now = Date.now();
  const recent = (hits.get(key) ?? []).filter((t) => now - t < windowMs);
  if (recent.length >= limit) {
    hits.set(key, recent);
    return { ok: false as const, retryAfter: Math.ceil((windowMs - (now - recent[0])) / 1000) };
  }
  if (!record) return { ok: true as const };
  recent.push(now);
  hits.set(key, recent);
  if (hits.size > 5000) for (const [k, v] of hits) if (v.every((t) => now - t >= windowMs)) hits.delete(k);
  return { ok: true as const };
}

export function recordHit(key: string) {
  hits.set(key, [...(hits.get(key) ?? []), Date.now()]);
}

export function clientIp(request: Request) {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "unknown"
  );
}
