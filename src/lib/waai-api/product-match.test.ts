import { describe, expect, it } from "vitest";
import {
  normalizeProductQuery,
  pickBestProductMatch,
  significantTokens,
} from "@/lib/waai-api/product-match";

describe("normalizeProductQuery", () => {
  it("normalizes Turkish casing and punctuation", () => {
    expect(normalizeProductQuery("  iPhone 16 Pro! ")).toBe("iphone 16 pro");
    expect(normalizeProductQuery("Samsung G95NC")).toBe("samsung g95nc");
  });
});

describe("significantTokens", () => {
  it("drops stop words", () => {
    expect(significantTokens("iPhone 16 ve Pro model")).toEqual([
      "iphone",
      "16",
      "pro",
    ]);
  });
});

describe("pickBestProductMatch", () => {
  const catalog = [
    { name: "Samsung QLED 65", sku: "BV-MOCK-1028", soldCount: 33 },
    {
      name: "Samsung G95NC PC düz ekran monitörü",
      sku: "LS57CG952NUXEN",
      soldCount: 1,
    },
    { name: "Epson L3250", sku: "BV-MOCK-1025", soldCount: 30 },
    {
      name: "Epson T7700DM büyük format yazıcı",
      sku: "C11CH84301A0",
      soldCount: 1,
    },
    { name: "iPhone 15", sku: "BV-MOCK-1001", soldCount: 4 },
    { name: "iPhone 16 Pro", sku: "BV-MOCK-1000", soldCount: 16 },
  ];

  it("prefers distinctive model tokens over popular brand siblings", () => {
    expect(pickBestProductMatch("Samsung G95NC", catalog)?.sku).toBe(
      "LS57CG952NUXEN",
    );
    expect(pickBestProductMatch("Epson T7700DM", catalog)?.sku).toBe(
      "C11CH84301A0",
    );
  });

  it("ranks iPhone queries sensibly", () => {
    expect(pickBestProductMatch("iPhone 16 Pro", catalog)?.sku).toBe(
      "BV-MOCK-1000",
    );
    expect(pickBestProductMatch("iphone 15", catalog)?.sku).toBe(
      "BV-MOCK-1001",
    );
  });

  it("keeps parent product discoverable from variant-like SKUs", () => {
    const withParent = [
      ...catalog,
      { name: "Boravin Demo Ürün 6", sku: "BV-MOCK-1035", soldCount: 2 },
    ];
    expect(pickBestProductMatch("BV-MOCK-1035-BLK", withParent)?.sku).toBe(
      "BV-MOCK-1035",
    );
  });
});
