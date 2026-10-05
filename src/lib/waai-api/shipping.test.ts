import { describe, expect, it } from "vitest";
import {
  extractOrderLookupKey,
  looksLikePhoneQuery,
  normalizeTrackingInput,
  phoneLast10,
} from "@/lib/waai-api/shipping";
import { toWhatsAppDigits } from "@/lib/messaging/whatsapp";

describe("normalizeTrackingInput", () => {
  it("strips spaces and uppercases", () => {
    expect(normalizeTrackingInput("  ab 123-xy ")).toBe("AB123-XY");
  });

  it("keeps order numbers usable", () => {
    expect(normalizeTrackingInput("wa1234567890")).toBe("WA1234567890");
  });
});

describe("extractOrderLookupKey", () => {
  it("pulls WA/BV codes from chatty text", () => {
    expect(extractOrderLookupKey("sipariş no: wa0968498494")).toBe(
      "WA0968498494",
    );
    expect(extractOrderLookupKey("#BV0769112478 lütfen")).toBe("BV0769112478");
  });
});

describe("looksLikePhoneQuery", () => {
  it("detects phones and rejects order numbers", () => {
    expect(looksLikePhoneQuery("05338507761")).toBe(true);
    expect(looksLikePhoneQuery("+90 533 850 77 61")).toBe(true);
    expect(looksLikePhoneQuery("WA0968498494")).toBe(false);
    expect(looksLikePhoneQuery("wa0968498494")).toBe(false);
  });
});

describe("phoneLast10", () => {
  it("normalizes to national last 10", () => {
    expect(phoneLast10("05338507761")).toBe("5338507761");
    expect(phoneLast10("+90 533 850 77 61")).toBe("5338507761");
    expect(phoneLast10("905338507761")).toBe("5338507761");
  });
});

describe("toWhatsAppDigits", () => {
  it("normalizes TR/KKTC mobiles", () => {
    expect(toWhatsAppDigits("0533 850 77 61")).toBe("905338507761");
    expect(toWhatsAppDigits("+90 539 117 27 82")).toBe("905391172782");
    expect(toWhatsAppDigits("5338507761")).toBe("905338507761");
  });
});
