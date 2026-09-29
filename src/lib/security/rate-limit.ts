type Bucket = { timestamps: number[] };

const store = new Map<string, Bucket>();

export function rateLimit(
  key: string,
  options?: { windowMs?: number; max?: number },
) {
  const windowMs =
    options?.windowMs ??
    Number(process.env.RATE_LIMIT_WINDOW_MS ?? 60_000);
  const max =
    options?.max ?? Number(process.env.RATE_LIMIT_MAX ?? 60);
  const now = Date.now();
  const bucket = store.get(key) ?? { timestamps: [] };
  bucket.timestamps = bucket.timestamps.filter((t) => now - t < windowMs);

  if (bucket.timestamps.length >= max) {
    store.set(key, bucket);
    return {
      success: false as const,
      remaining: 0,
      retryAfterMs: windowMs - (now - bucket.timestamps[0]),
    };
  }

  bucket.timestamps.push(now);
  store.set(key, bucket);
  return {
    success: true as const,
    remaining: max - bucket.timestamps.length,
    retryAfterMs: 0,
  };
}
