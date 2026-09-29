"use server";

import { z } from "zod";
import { requirePermission } from "@/lib/auth/rbac";
import { generateCampaign } from "@/lib/ai/services/campaign";
import { generateProductDescription } from "@/lib/ai/services/product-description";
import { generateAnnouncement } from "@/lib/ai/services/announcement";
import { generateSEO } from "@/lib/ai/services/seo";
import { rateLimit } from "@/lib/security/rate-limit";

export async function aiGenerateCampaignAction(brief: string) {
  const session = await requirePermission("AI_USE");
  const limit = rateLimit(`ai:${session.user.id}`, { max: 20 });
  if (!limit.success) throw new Error("RATE_LIMIT");
  const parsed = z.string().min(10).parse(brief);
  return generateCampaign(parsed, session.user.id);
}

export async function aiGenerateProductAction(input: {
  name: string;
  features?: string;
  specs?: string;
}) {
  const session = await requirePermission("AI_USE");
  const limit = rateLimit(`ai:${session.user.id}`, { max: 20 });
  if (!limit.success) throw new Error("RATE_LIMIT");
  return generateProductDescription(input, session.user.id);
}

export async function aiGenerateAnnouncementAction(brief: string) {
  const session = await requirePermission("AI_USE");
  return generateAnnouncement(brief, session.user.id);
}

export async function aiGenerateSeoAction(input: {
  name: string;
  context?: string;
}) {
  const session = await requirePermission("AI_USE");
  return generateSEO(input, session.user.id);
}
