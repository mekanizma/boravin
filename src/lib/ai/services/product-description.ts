import { z } from "zod";
import { generateValidated } from "../validate";
import { brandSystemPrompt, getBrandGuidelines } from "../brand-context";
import { db } from "@/lib/db";
import { aiGenerations } from "@/lib/db/schema";

export const productDescriptionSchema = z.object({
  shortDescription: z.string(),
  description: z.string(),
  bulletPoints: z.array(z.string()),
  salesCopy: z.string(),
  seoTitle: z.string(),
  seoDescription: z.string(),
});

export async function generateProductDescription(
  input: {
    name: string;
    features?: string;
    specs?: string;
  },
  userId?: string,
) {
  const guidelines = await getBrandGuidelines();
  const prompt = `Ürün: ${input.name}\nÖzellikler: ${input.features ?? ""}\nTeknik: ${input.specs ?? ""}`;
  const output = await generateValidated(prompt, productDescriptionSchema, {
    system: brandSystemPrompt(guidelines),
  });

  await db.insert(aiGenerations).values({
    type: "product_description",
    provider: process.env.AI_PROVIDER ?? "gemini",
    promptCode: "product_description_prompt",
    input,
    output,
    createdBy: userId,
  });

  return output;
}
