import { z } from "zod";
import { generateValidated } from "@/lib/ai/validate";
import { brandSystemPrompt, getBrandGuidelines } from "@/lib/ai/brand-context";
import { db } from "@/lib/db";
import { aiGenerations } from "@/lib/db/schema";

export const bannerPromptSchema = z.object({
  websiteHero: z.string(),
  websiteBanner: z.string(),
  instagramPost: z.string(),
  instagramStory: z.string(),
  facebook: z.string(),
  whatsapp: z.string(),
});

export type BannerPromptOutput = z.infer<typeof bannerPromptSchema>;

export async function generateBannerPrompt(
  input: {
    theme: string;
    products?: string;
    platform?: string;
  },
  userId?: string,
) {
  const guidelines = await getBrandGuidelines();
  const output = await generateValidated(
    `Kampanya görsel promptları üret. Tema: ${input.theme}. Ürünler: ${input.products ?? ""}. Görsel stil: ${guidelines.visualStyle ?? ""}`,
    bannerPromptSchema,
    { system: brandSystemPrompt(guidelines) },
  );

  await db.insert(aiGenerations).values({
    type: "banner_prompt",
    provider: process.env.AI_PROVIDER ?? "gemini",
    promptCode: "image_prompt",
    input,
    output,
    createdBy: userId,
  });

  return output;
}
