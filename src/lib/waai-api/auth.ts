import { timingSafeEqual } from "node:crypto";
import { rateLimit } from "@/lib/security/rate-limit";
import { jsonError } from "@/lib/waai-api/http";

function configuredToken() {
  return process.env.WAAI_API_TOKEN?.trim() || "";
}

function extractBearer(request: Request) {
  const header = request.headers.get("authorization") ?? "";
  const match = /^Bearer\s+(.+)$/i.exec(header.trim());
  return match?.[1]?.trim() ?? "";
}

function tokensEqual(a: string, b: string) {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  if (left.length !== right.length) return false;
  return timingSafeEqual(left, right);
}

/** Validates Bearer token + light rate limit for Waai / AI integrations. */
export function requireWaaiAuth(request: Request) {
  const expected = configuredToken();
  if (!expected) {
    return {
      ok: false as const,
      response: jsonError(
        "API_TOKEN_NOT_CONFIGURED",
        "WAAI_API_TOKEN ortam değişkeni tanımlı değil.",
        503,
      ),
    };
  }

  const provided = extractBearer(request);
  if (!provided || !tokensEqual(provided, expected)) {
    return {
      ok: false as const,
      response: jsonError(
        "UNAUTHORIZED",
        "Geçersiz veya eksik Bearer token.",
        401,
      ),
    };
  }

  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "waai";
  const limited = rateLimit(`waai:${ip}`, {
    windowMs: Number(process.env.WAAI_RATE_LIMIT_WINDOW_MS ?? 60_000),
    max: Number(process.env.WAAI_RATE_LIMIT_MAX ?? 120),
  });
  if (!limited.success) {
    return {
      ok: false as const,
      response: jsonError(
        "RATE_LIMITED",
        "Çok fazla istek. Lütfen kısa süre sonra tekrar deneyin.",
        429,
        { retryAfterMs: limited.retryAfterMs },
      ),
    };
  }

  return { ok: true as const };
}

export function isWaaiApiConfigured() {
  return Boolean(configuredToken());
}
