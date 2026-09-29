import { z } from "zod";
import { generateValidated } from "../validate";
import { brandSystemPrompt, getBrandGuidelines } from "../brand-context";
import { db } from "@/lib/db";
import { aiGenerations } from "@/lib/db/schema";

export const campaignAISchema = z.object({
  title: z.string(),
  shortDescription: z.string(),
  description: z.string(),
  cta: z.string(),
  socialText: z.string(),
  websiteAnnouncement: z.string(),
  smsText: z.string(),
  emailText: z.string(),
  seoDescription: z.string(),
});

export type CampaignAIOutput = z.infer<typeof campaignAISchema>;

export async function generateCampaign(brief: string, userId?: string) {
  const guidelines = await getBrandGuidelines();
  const prompt = `Aşağıdaki brief için bir e-ticaret kampanyası üret:\n${brief}`;
  const output = await generateValidated(prompt, campaignAISchema, {
    system: brandSystemPrompt(guidelines),
  });

  await db.insert(aiGenerations).values({
    type: "campaign",
    provider: process.env.AI_PROVIDER ?? "gemini",
    model: process.env.GEMINI_MODEL,
    promptCode: "campaign_prompt",
    input: { brief },
    output,
    createdBy: userId,
  });

  return output;
}
