import { describe, expect, it } from "vitest";
import {
  HIGH_CONFIDENCE_THRESHOLD,
  MAX_SEARCH_QUERY_LENGTH,
  clampSearchQuery,
  extractModelSignals,
  extractProductSearchQuery,
  isModelCodeToken,
  isUnambiguousHighConfidence,
  matchConfidence,
  normalizeProductQuery,
  pickBestProductMatch,
  rankProductMatches,
  rankProductMatchesWithConfidence,
  scoreProductMatch,
  significantTokens,
} from "@/lib/waai-api/product-match";

const G95NC_NAME =
  'Samsung G95NC PC Düz Ekran Monitörü 144,8 cm (57") 7680 x 2160 Piksel Dual UHD LED Siyah/Beyaz';

const catalog = [
  {
    name: G95NC_NAME,
    sku: "LS57CG952NUXEN",
    slug: "samsung-g95nc-monitor",
    barcode: "8806095221234",
    brandName: "Samsung",
    categoryName: "Monitör",
    stock: 3,
    soldCount: 1,
  },
  {
    name: "Samsung G93SC Odyssey OLED Gaming Monitor",
    sku: "LS49G93SC",
    slug: "samsung-g93sc",
    brandName: "Samsung",
    stock: 5,
    soldCount: 40,
  },
  {
    name: "Samsung G95SD Neo QLED Gaming Monitor",
    sku: "LS57G95SD",
    slug: "samsung-g95sd",
    brandName: "Samsung",
    stock: 2,
    soldCount: 22,
  },
  {
    name: "Samsung QLED 65",
    sku: "BV-MOCK-1028",
    brandName: "Samsung",
    stock: 10,
    soldCount: 33,
  },
  {
    name: "Epson L3250",
    sku: "BV-MOCK-1025",
    brandName: "Epson",
    stock: 0,
    soldCount: 30,
  },
  {
    name: "Epson T7700DM büyük format yazıcı",
    sku: "C11CH84301A0",
    brandName: "Epson",
    stock: 1,
    soldCount: 1,
  },
  {
    name: "iPhone 15",
    sku: "BV-MOCK-1001",
    brandName: "Apple",
    stock: 4,
    soldCount: 4,
  },
  {
    name: "iPhone 16 Pro",
    sku: "BV-MOCK-1000",
    brandName: "Apple",
    stock: 8,
    soldCount: 16,
  },
  {
    name: "NVIDIA GeForce RTX 5070 Founders Edition",
    sku: "RTX5070-FE",
    brandName: "NVIDIA",
    stock: 1,
    soldCount: 5,
  },
];

describe("normalizeProductQuery", () => {
  it("normalizes Turkish casing, punctuation and separators", () => {
    expect(normalizeProductQuery("  iPhone 16 Pro! ")).toBe("iphone 16 pro");
    expect(normalizeProductQuery("Samsung G95NC")).toBe("samsung g95nc");
    expect(normalizeProductQuery("Samsung/G95NC (57\")")).toBe("samsung g95nc 57");
    expect(normalizeProductQuery("  Samsung   G95NC  ")).toBe("samsung g95nc");
  });
});

describe("clampSearchQuery", () => {
  it("trims and caps length", () => {
    expect(clampSearchQuery("  hi  ")).toBe("hi");
    expect(clampSearchQuery("x".repeat(250)).length).toBe(MAX_SEARCH_QUERY_LENGTH);
  });
});

describe("extractProductSearchQuery", () => {
  it("strips feature/price chat fluff without dropping model codes", () => {
    expect(extractProductSearchQuery("samsung g95nc özellikleri neler")).toBe(
      "samsung g95nc",
    );
    expect(
      extractProductSearchQuery("Samsung G95NC özellikleri nedir?"),
    ).toBe("samsung g95nc");
    expect(extractProductSearchQuery("iphone 15 fiyatı ne kadar")).toBe(
      "iphone 15",
    );
    expect(extractProductSearchQuery("tell me about Samsung G95NC specs")).toBe(
      "samsung g95nc",
    );
  });

  it("falls back to original when cleaning would empty the query", () => {
    expect(extractProductSearchQuery("nedir")).toBe("nedir");
  });
});

describe("significantTokens / model codes", () => {
  it("drops stop words and keeps model codes", () => {
    expect(significantTokens("iPhone 16 ve Pro model")).toEqual([
      "iphone",
      "16",
      "pro",
    ]);
    expect(significantTokens("samsung g95nc özellikleri neler")).toEqual([
      "samsung",
      "g95nc",
    ]);
  });

  it("detects model-code tokens and spaced forms", () => {
    expect(isModelCodeToken("g95nc")).toBe(true);
    expect(isModelCodeToken("14t")).toBe(true);
    expect(isModelCodeToken("a55")).toBe(true);
    expect(isModelCodeToken("g10")).toBe(true);
    expect(isModelCodeToken("rtx5070")).toBe(true);
    expect(isModelCodeToken("samsung")).toBe(false);

    const spaced = extractModelSignals(["rtx", "5070"]);
    expect(spaced.some((s) => s.joined === "rtx5070")).toBe(true);

    const combo = extractModelSignals(["250", "g10"]);
    expect(combo.some((s) => s.joined === "250g10" || s.joined === "g10")).toBe(
      true,
    );
  });
});

describe("G95NC ranking", () => {
  const queries = [
    "Samsung G95NC",
    "samsung g95nc",
    "G95NC",
    "g95nc",
    "Samsung G95NC özellikleri nedir",
    "Samsung G95NC monitor",
    "Samsung G95NC monitör",
  ];

  for (const q of queries) {
    it(`ranks G95NC first for "${q}"`, () => {
      const best = pickBestProductMatch(q, catalog);
      expect(best?.sku).toBe("LS57CG952NUXEN");
    });
  }

  it("keeps G95NC far above sibling Odyssey models for G95NC query", () => {
    const ranked = rankProductMatches("G95NC", catalog);
    expect(ranked[0]?.sku).toBe("LS57CG952NUXEN");
    const winner = ranked[0]!.matchScore;
    const g93 = ranked.find((r) => r.sku === "LS49G93SC");
    const g95sd = ranked.find((r) => r.sku === "LS57G95SD");
    if (g93) expect(winner).toBeGreaterThan(g93.matchScore + 200);
    if (g95sd) expect(winner).toBeGreaterThan(g95sd.matchScore + 200);
  });

  it("does not prefer popular Samsung QLED over G95NC", () => {
    expect(pickBestProductMatch("Samsung G95NC", catalog)?.sku).toBe(
      "LS57CG952NUXEN",
    );
    expect(
      scoreProductMatch("Samsung G95NC", catalog[0]!) >
        scoreProductMatch("Samsung G95NC", catalog[3]!),
    ).toBe(true);
  });
});

describe("identity and other match modes", () => {
  it("ranks exact SKU first", () => {
    expect(pickBestProductMatch("LS57CG952NUXEN", catalog)?.sku).toBe(
      "LS57CG952NUXEN",
    );
    expect(scoreProductMatch("LS57CG952NUXEN", catalog[0]!)).toBe(1000);
  });

  it("matches barcode and slug exactly", () => {
    expect(scoreProductMatch("8806095221234", catalog[0]!)).toBe(950);
    expect(scoreProductMatch("samsung-g95nc-monitor", catalog[0]!)).toBe(900);
  });

  it("matches partial product name and brand+model", () => {
    expect(
      pickBestProductMatch("Samsung G95NC PC Düz Ekran Monitörü", catalog)?.sku,
    ).toBe("LS57CG952NUXEN");
    expect(pickBestProductMatch("Epson T7700DM", catalog)?.sku).toBe(
      "C11CH84301A0",
    );
  });

  it("is case insensitive and tolerates extra spaces / punctuation", () => {
    expect(pickBestProductMatch("  SAMSUNG   g95nc  ", catalog)?.sku).toBe(
      "LS57CG952NUXEN",
    );
    expect(pickBestProductMatch("Samsung-G95NC", catalog)?.sku).toBe(
      "LS57CG952NUXEN",
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

  it("matches spaced GPU model codes", () => {
    expect(pickBestProductMatch("RTX 5070", catalog)?.sku).toBe("RTX5070-FE");
    expect(pickBestProductMatch("rtx5070", catalog)?.sku).toBe("RTX5070-FE");
  });

  it("keeps parent product discoverable from variant-like SKUs", () => {
    const withParent = [
      ...catalog,
      { name: "Boravin Demo Ürün 6", sku: "BV-MOCK-1035", soldCount: 2, stock: 1 },
    ];
    expect(pickBestProductMatch("BV-MOCK-1035-BLK", withParent)?.sku).toBe(
      "BV-MOCK-1035",
    );
  });

  it("returns nullish ranking for empty / unknown queries", () => {
    expect(rankProductMatches("", catalog)).toEqual([]);
    expect(pickBestProductMatch("zzz-no-such-product-xyz", catalog)).toBeNull();
  });

  it("prefers in-stock on equal scores via secondary sort", () => {
    const twins = [
      { name: "Demo Twin A", sku: "TWIN-A", stock: 0, soldCount: 0 },
      { name: "Demo Twin B", sku: "TWIN-B", stock: 4, soldCount: 0 },
    ];
    // Force similar scores with identical names pattern
    const ranked = rankProductMatches("Demo Twin", twins, { minScore: 1 });
    expect(ranked[0]?.sku).toBe("TWIN-B");
  });

  it("name match outranks description-only match", () => {
    const rows = [
      {
        name: "Generic Cable",
        sku: "CABLE-1",
        description: "Compatible with Samsung G95NC mount",
        stock: 9,
      },
      {
        name: G95NC_NAME,
        sku: "LS57CG952NUXEN",
        description: "Odyssey monitor",
        brandName: "Samsung",
        stock: 1,
      },
    ];
    const ranked = rankProductMatches("Samsung G95NC", rows);
    expect(ranked[0]?.sku).toBe("LS57CG952NUXEN");
    expect(ranked[0]!.matchScore).toBeGreaterThan(
      scoreProductMatch("Samsung G95NC", rows[0]!),
    );
  });
});

describe("confidence / ambiguous resolve", () => {
  it("gives high confidence to brand+model and model-code queries", () => {
    expect(matchConfidence("Samsung G95NC", catalog[0]!)).toBeGreaterThanOrEqual(
      HIGH_CONFIDENCE_THRESHOLD,
    );
    expect(matchConfidence("G95NC", catalog[0]!)).toBeGreaterThanOrEqual(
      HIGH_CONFIDENCE_THRESHOLD,
    );
    expect(matchConfidence("LS57CG952NUXEN", catalog[0]!)).toBe(1);
  });

  it("does not give high confidence to sibling Odyssey models for G95NC", () => {
    expect(matchConfidence("G95NC", catalog[1]!)).toBeLessThan(
      HIGH_CONFIDENCE_THRESHOLD,
    );
    expect(matchConfidence("G95NC", catalog[2]!)).toBeLessThan(
      HIGH_CONFIDENCE_THRESHOLD,
    );
  });

  it("treats G95NC as unambiguous high-confidence among siblings", () => {
    const ranked = rankProductMatchesWithConfidence("G95NC", catalog);
    expect(ranked[0]?.sku).toBe("LS57CG952NUXEN");
    expect(isUnambiguousHighConfidence(ranked)).toBe(true);
  });

  it("does not auto-resolve broad brand queries", () => {
    const ranked = rankProductMatchesWithConfidence("Samsung", catalog, {
      minScore: 1,
    });
    expect(isUnambiguousHighConfidence(ranked)).toBe(false);
  });

  it("strips natural-language fluff including teknik özellik / kaç para", () => {
    expect(
      extractProductSearchQuery("Samsung G95NC teknik özellikleri nedir"),
    ).toBe("samsung g95nc");
    expect(extractProductSearchQuery("G95NC stokta mı")).toBe("g95nc");
    expect(extractProductSearchQuery("Samsung G95NC kaç para")).toBe(
      "samsung g95nc",
    );
  });
});
