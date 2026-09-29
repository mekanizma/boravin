import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { settings } from "@/lib/db/schema";

export type BrandAIGuidelines = {
  tone?: string;
  colors?: string[];
  fonts?: string;
  addressStyle?: string;
  forbiddenWords?: string[];
  slogans?: string[];
  visualStyle?: string;
  targetCustomer?: string;
};

export async function getBrandGuidelines(): Promise<BrandAIGuidelines> {
  try {
    const row = await db.query.settings.findFirst({
      where: eq(settings.key, "brand_ai_guidelines"),
    });
    if (!row) {
      return {
        tone: "Profesyonel, güvenilir, premium teknoloji perakendesi",
        colors: ["#0E1116", "#F3F1ED", "#C45C26"],
        addressStyle: "Siz",
        forbiddenWords: ["ucuz", "bedava", "sahte"],
        slogans: ["Kıbrısın Teknoloji Merkezi"],
        visualStyle: "Editorial product photography, clean tech retail",
        targetCustomer: "Kıbrıs'ta teknoloji ve elektronik ürün arayan tüketiciler",
      };
    }
    return row.value as BrandAIGuidelines;
  } catch {
    return {
      tone: "Profesyonel ve güvenilir",
      slogans: ["Kıbrısın Teknoloji Merkezi"],
    };
  }
}

/** Alias used by AI service modules */
export async function getBrandContext(): Promise<string> {
  return brandSystemPrompt(await getBrandGuidelines());
}

export function brandSystemPrompt(guidelines: BrandAIGuidelines) {
  return [
    "Sen BORAVIN markası için içerik üreten bir e-ticaret copywriter'sın.",
    `Marka dili: ${guidelines.tone ?? ""}`,
    `Hitap: ${guidelines.addressStyle ?? "Siz"}`,
    `Hedef müşteri: ${guidelines.targetCustomer ?? ""}`,
    `Yasak kelimeler: ${(guidelines.forbiddenWords ?? []).join(", ")}`,
    `Sloganlar: ${(guidelines.slogans ?? []).join(", ")}`,
    "Çıktıyı geçerli JSON olarak ver. Türkçe yaz.",
  ].join("\n");
}
