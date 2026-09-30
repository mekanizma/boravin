import "server-only";

import { z } from "zod";
import { generateValidated } from "@/lib/ai/validate";
import { geminiApiKey } from "@/lib/ai/gemini-env";

export const heroCopySchema = z.object({
  eyebrow: z.string(),
  title: z.string(),
  body: z.string(),
  buttonLabel: z.string(),
});

export type HeroCopyFields = z.infer<typeof heroCopySchema>;

const CTA_FALLBACKS: Record<string, string> = {
  "alışverişe başla": "Start shopping",
  "hemen keşfet": "Explore now",
  "incele": "View",
  "detaylı incele": "See details",
  "kampanyaya git": "Go to campaign",
};

function emptyCopy(): HeroCopyFields {
  return { eyebrow: "", title: "", body: "", buttonLabel: "" };
}

function hasAnyText(fields: HeroCopyFields) {
  return Boolean(
    fields.eyebrow.trim() ||
      fields.title.trim() ||
      fields.body.trim() ||
      fields.buttonLabel.trim(),
  );
}

/** Fast path for empty / trivial CTA-only copy without calling the model. */
function heuristicTranslate(fields: HeroCopyFields): HeroCopyFields | null {
  const eyebrow = fields.eyebrow.trim();
  const title = fields.title.trim();
  const body = fields.body.trim();
  const buttonLabel = fields.buttonLabel.trim();

  if (!eyebrow && !title && !body) {
    const ctaKey = buttonLabel.toLocaleLowerCase("tr-TR");
    return {
      eyebrow: "",
      title: "",
      body: "",
      buttonLabel: CTA_FALLBACKS[ctaKey] || buttonLabel,
    };
  }
  return null;
}

/**
 * Translate Turkish hero slide copy to English for the storefront locale switch.
 * Soft-fails to empty EN fields when Gemini is unavailable.
 */
export async function translateHeroCopyToEn(
  fields: HeroCopyFields,
): Promise<HeroCopyFields> {
  const normalized: HeroCopyFields = {
    eyebrow: fields.eyebrow.trim(),
    title: fields.title.trim(),
    body: fields.body.trim(),
    buttonLabel: fields.buttonLabel.trim(),
  };

  if (!hasAnyText(normalized)) return emptyCopy();

  const heuristic = heuristicTranslate(normalized);
  if (heuristic) return heuristic;

  if (!geminiApiKey()) {
    return {
      ...normalized,
      buttonLabel:
        CTA_FALLBACKS[normalized.buttonLabel.toLocaleLowerCase("tr-TR")] ||
        normalized.buttonLabel,
    };
  }

  try {
    return await generateValidated(
      [
        "Translate the following Boravin e-commerce homepage hero slide copy from Turkish to English.",
        "Keep the tone commercial, concise, and natural for a Cyprus tech retailer.",
        "Preserve brand names (ASUS, Apple, Dyson, etc.).",
        "Return JSON with exactly these string keys: eyebrow, title, body, buttonLabel.",
        "Use empty string for any input field that is empty.",
        "",
        JSON.stringify(normalized),
      ].join("\n"),
      heroCopySchema,
      {
        system:
          "You are a professional TR→EN translator for Boravin retail marketing copy. Output JSON only.",
        temperature: 0.2,
        retries: 1,
      },
    );
  } catch {
    return {
      ...normalized,
      buttonLabel:
        CTA_FALLBACKS[normalized.buttonLabel.toLocaleLowerCase("tr-TR")] ||
        normalized.buttonLabel,
    };
  }
}
