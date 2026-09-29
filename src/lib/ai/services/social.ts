import { z } from "zod";
import { generateValidated } from "@/lib/ai/validate";
import { brandSystemPrompt, getBrandGuidelines } from "@/lib/ai/brand-context";
import { db } from "@/lib/db";
import { aiGenerations } from "@/lib/db/schema";

export const socialSchema = z.object({
  instagram: z.string(),
  facebook: z.string(),
  whatsapp: z.string(),
  x: z.string().optional(),
  hashtags: z.array(z.string()).optional(),
  cta: z.string().optional(),
});

export type SocialOutput = z.infer<typeof socialSchema>;

export async function generateSocialPost(brief: string, userId?: string) {
  const guidelines = await getBrandGuidelines();
  const output = await generateValidated(
    `Sosyal medya metinleri: ${brief}`,
    socialSchema,
    { system: brandSystemPrompt(guidelines) },
  );

  await db.insert(aiGenerations).values({
    type: "social",
    provider: process.env.AI_PROVIDER ?? "gemini",
    promptCode: "social_prompt",
    input: { brief },
    output,
    createdBy: userId,
  });

  return output;
}
