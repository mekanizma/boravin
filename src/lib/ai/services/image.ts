import { z } from "zod";
import { generateValidated } from "@/lib/ai/validate";
import { brandSystemPrompt, getBrandGuidelines } from "@/lib/ai/brand-context";
import { db } from "@/lib/db";
import { aiGenerations } from "@/lib/db/schema";
import { generateBannerPrompt } from "@/lib/ai/services/banner-prompt";

export const imageBriefSchema = z.object({
  prompt: z.string(),
  aspectRatio: z.string().default("1:1"),
  altText: z.string(),
  negativePrompt: z.string().optional(),
});

export type ImageBriefOutput = z.infer<typeof imageBriefSchema>;

export async function generateImageBrief(
  input: { subject: string; usage?: string; aspectRatio?: string },
  userId?: string,
) {
  const guidelines = await getBrandGuidelines();
  const output = await generateValidated(
    `Görsel brief üret. Konu: ${input.subject}. Kullanım: ${input.usage ?? "product"}. Oran: ${input.aspectRatio ?? "1:1"}. Stil: ${guidelines.visualStyle ?? ""}`,
    imageBriefSchema,
    { system: brandSystemPrompt(guidelines) },
  );

  await db.insert(aiGenerations).values({
    type: "image",
    provider: process.env.AI_PROVIDER ?? "gemini",
    promptCode: "image_prompt",
    input,
    output,
    createdBy: userId,
  });

  return output;
}

export async function generateCampaignImageArchitecture(input: {
  theme: string;
  aspectRatio: string;
}) {
  const prompts = await generateBannerPrompt({ theme: input.theme });
  return {
    provider: process.env.AI_IMAGE_PROVIDER ?? "gemini",
    aspectRatio: input.aspectRatio,
    prompts,
    note: "Image bytes require an image API provider in production",
  };
}

export async function generateImage(
  input: { subject: string; usage?: string; aspectRatio?: string },
  userId?: string,
) {
  const brief = await generateImageBrief(input, userId);
  return {
    brief,
    result: {
      provider: process.env.AI_IMAGE_PROVIDER ?? "gemini",
      prompt: brief.prompt,
      aspectRatio: brief.aspectRatio,
      note: "Wire to an image generation API to return bytes/URL",
    },
  };
}
