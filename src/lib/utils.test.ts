import { describe, expect, it } from "vitest";
import { z } from "zod";
import { formatCurrency, slugify } from "@/lib/utils";
import { convertAmount } from "@/lib/currency";
import { rateLimit } from "@/lib/security/rate-limit";

const campaignAISchema = z.object({
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

describe("utils", () => {
  it("slugify turkish characters", () => {
    expect(slugify("İPhone Şarjı")).toContain("phone");
    expect(slugify("Gaming Laptop")).toBe("gaming-laptop");
  });

  it("formats TRY currency", () => {
    const value = formatCurrency(1000, "TRY", "tr-TR");
    expect(value).toContain("1");
  });
});

describe("currency", () => {
  it("converts via TRY base", () => {
    expect(convertAmount(100, "TRY", "TRY")).toBe(100);
  });
});

describe("rateLimit", () => {
  it("allows then blocks", () => {
    const key = `test-${Date.now()}`;
    const a = rateLimit(key, { windowMs: 10_000, max: 2 });
    const b = rateLimit(key, { windowMs: 10_000, max: 2 });
    const c = rateLimit(key, { windowMs: 10_000, max: 2 });
    expect(a.success).toBe(true);
    expect(b.success).toBe(true);
    expect(c.success).toBe(false);
  });
});

describe("ai schemas", () => {
  it("validates campaign output", () => {
    const parsed = campaignAISchema.parse({
      title: "Yaz Kampanyası",
      shortDescription: "Kısa",
      description: "Uzun açıklama",
      cta: "Alışverişe başla",
      socialText: "Sosyal",
      websiteAnnouncement: "Duyuru",
      smsText: "SMS",
      emailText: "Email",
      seoDescription: "SEO açıklaması burada yeterince uzun",
    });
    expect(parsed.title).toBe("Yaz Kampanyası");
  });
});
