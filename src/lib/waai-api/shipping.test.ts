import { describe, expect, it } from "vitest";
import { normalizeTrackingInput } from "@/lib/waai-api/shipping";
import { toWhatsAppDigits } from "@/lib/messaging/whatsapp";

describe("normalizeTrackingInput", () => {
  it("strips spaces and uppercases", () => {
    expect(normalizeTrackingInput("  ab 123-xy ")).toBe("AB123-XY");
  });

  it("keeps order numbers usable", () => {
    expect(normalizeTrackingInput("wa1234567890")).toBe("WA1234567890");
  });
});

describe("toWhatsAppDigits", () => {
  it("normalizes TR/KKTC mobiles", () => {
    expect(toWhatsAppDigits("0533 850 77 61")).toBe("905338507761");
    expect(toWhatsAppDigits("+90 539 117 27 82")).toBe("905391172782");
    expect(toWhatsAppDigits("5338507761")).toBe("905338507761");
  });
});
