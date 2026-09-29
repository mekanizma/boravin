import { z } from "zod";
import { generateValidated } from "@/lib/ai/validate";
import { brandSystemPrompt, getBrandGuidelines } from "@/lib/ai/brand-context";
import { db } from "@/lib/db";
import { aiGenerations } from "@/lib/db/schema";

export const announcementSchema = z.object({
  title: z.string(),
  description: z.string(),
  cta: z.string(),
  type: z
    .enum(["top_bar", "popup", "homepage_banner", "campaign_banner"])
    .optional(),
  socialText: z.string().optional(),
  linkUrl: z.string().optional(),
});

export type AnnouncementOutput = z.infer<typeof announcementSchema>;

export async function generateAnnouncement(brief: string, userId?: string) {
  const guidelines = await getBrandGuidelines();
  const output = await generateValidated(
    `Duyuru brief: ${brief}`,
    announcementSchema,
    { system: brandSystemPrompt(guidelines) },
  );

  await db.insert(aiGenerations).values({
    type: "announcement",
    provider: process.env.AI_PROVIDER ?? "gemini",
    promptCode: "announcement_prompt",
    input: { brief },
    output,
    createdBy: userId,
  });

  return output;
}
