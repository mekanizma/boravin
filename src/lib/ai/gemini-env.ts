import "server-only";

import type { RequestOptions } from "@google/generative-ai";

/** Widely available Flash model; override with GEMINI_MODEL if needed. */
export const GEMINI_FREE_MODEL = "gemini-3.8-flash";

export function geminiApiKey(): string | null {
  const key = process.env.GEMINI_API_KEY?.trim() || process.env.GOOGLE_AI_API_KEY?.trim();
  return key || null;
}

export function geminiModel(): string {
  return process.env.GEMINI_MODEL?.trim() || GEMINI_FREE_MODEL;
}

/**
 * Numeric Cloud project for `x-goog-user-project`.
 * The API adds the `projects/` prefix itself, so `projects/123` is stored as `123`.
 */
export function geminiProjectNumber(): string | null {
  const raw = (process.env.GEMINI_PROJECT ?? process.env.GOOGLE_CLOUD_PROJECT ?? "").trim();
  const id = raw.replace(/^projects\//, "");
  return /^\d+$/.test(id) ? id : null;
}

export function geminiRequestOptions(timeout = 20000): RequestOptions {
  const project = geminiProjectNumber();
  return {
    timeout,
    ...(project ? { customHeaders: { "x-goog-user-project": project } } : {}),
  };
}
