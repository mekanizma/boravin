import { z } from "zod";
import { generateValidated } from "@/lib/ai/validate";
import { brandSystemPrompt, getBrandGuidelines } from "@/lib/ai/brand-context";
import { db } from "@/lib/db";
import { aiGenerations } from "@/lib/db/schema";

export const seoSchema = z.object({
  title: z.string(),
  description: z.string(),
  keywords: z.array(z.string()),
  slugSuggestion: z.string().optional(),
});

export type SeoOutput = z.infer<typeof seoSchema>;

export async function generateSEO(
  input: { name: string; context?: string; entityType?: string },
  userId?: string,
) {
  const guidelines = await getBrandGuidelines();
  const output = await generateValidated(
    `SEO üret: ${input.name}\nTip: ${input.entityType ?? "page"}\n${input.context ?? ""}`,
    seoSchema,
    { system: brandSystemPrompt(guidelines) },
  );

  await db.insert(aiGenerations).values({
    type: "seo",
    provider: process.env.AI_PROVIDER ?? "gemini",
    promptCode: "seo_prompt",
    input,
    output,
    createdBy: userId,
  });

  return output;
}

export const generateSeo = generateSEO;
