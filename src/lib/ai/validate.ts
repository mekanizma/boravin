import type { ZodType } from "zod";
import { getAIProvider } from "@/lib/ai/factory";

function extractJson(text: string): string {
  const trimmed = text.trim();
  if (trimmed.startsWith("{") || trimmed.startsWith("[")) {
    return trimmed;
  }

  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenced?.[1]) {
    return fenced[1].trim();
  }

  const objectMatch = trimmed.match(/\{[\s\S]*\}/);
  if (objectMatch) {
    return objectMatch[0];
  }

  const arrayMatch = trimmed.match(/\[[\s\S]*\]/);
  if (arrayMatch) {
    return arrayMatch[0];
  }

  return trimmed;
}

/**
 * Generate text via the configured AI provider and parse with Zod.
 * Retries once on parse/validation failure.
 */
export async function generateValidated<T>(
  prompt: string,
  schema: ZodType<T>,
  options?: { system?: string; retries?: number; temperature?: number },
): Promise<T> {
  const provider = getAIProvider();
  const retries = options?.retries ?? 1;
  let lastError: unknown;

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const attemptPrompt =
        attempt === 0
          ? prompt
          : [
              prompt,
              "",
              "Previous output failed validation. Return ONLY valid JSON.",
              lastError instanceof Error ? lastError.message : String(lastError),
            ].join("\n");

      const raw = await provider.generateText(attemptPrompt, {
        system: options?.system,
        temperature: options?.temperature,
        json: true,
      });
      const parsed: unknown = JSON.parse(extractJson(raw));
      return schema.parse(parsed);
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError instanceof Error
    ? lastError
    : new Error("AI output validation failed");
}
