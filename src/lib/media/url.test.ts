import { describe, expect, it } from "vitest";
import { isStoredMediaUrl, publicImageUrl } from "@/lib/media/url";

describe("isStoredMediaUrl", () => {
  it("accepts local uploads paths", () => {
    expect(isStoredMediaUrl("/uploads/homepage/abc.jpg")).toBe(true);
    expect(isStoredMediaUrl("uploads/homepage/abc.jpg")).toBe(true);
  });

  it("accepts Supabase public storage URLs", () => {
    expect(
      isStoredMediaUrl(
        "https://xyz.supabase.co/storage/v1/object/public/boravin-media/homepage/abc.jpg",
      ),
    ).toBe(true);
  });

  it("rejects external marketing URLs", () => {
    expect(
      isStoredMediaUrl(
        "https://images.unsplash.com/photo-1?auto=format&fit=crop&w=800",
      ),
    ).toBe(false);
  });
});

describe("publicImageUrl", () => {
  it("normalizes relative uploads paths", () => {
    expect(publicImageUrl("uploads/a.jpg")).toBe("/uploads/a.jpg");
  });
});
