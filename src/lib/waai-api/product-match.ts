/** Shared WhatsApp / Waai product query normalization and ranking. */

export function normalizeProductQuery(value: string) {
  return value
    .toLocaleLowerCase("tr-TR")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9ğüşıöç\s+-]/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Chat intent words that must not block catalog matching. */
const INTENT_WORDS = new Set([
  "ozellik",
  "ozellikleri",
  "ozellikler",
  "özellik",
  "özellikleri",
  "özellikler",
  "spec",
  "specs",
  "nedir",
  "neler",
  "nelerdir",
  "ne",
  "kadar",
  "fiyat",
  "fiyati",
  "fiyatı",
  "fiyati?",
  "stok",
  "stogu",
  "stoğu",
  "var",
  "mi",
  "mı",
  "mu",
  "mü",
  "varmi",
  "var mı",
  "hakkinda",
  "hakkında",
  "detay",
  "detayli",
  "detaylı",
  "anlat",
  "goster",
  "göster",
  "bak",
  "bakar",
  "misin",
  "mısın",
  "lütfen",
  "lutfen",
  "istiyorum",
  "isterim",
  "alabilir",
  "miyim",
]);

const STOP_WORDS = new Set([
  "ve",
  "ile",
  "for",
  "the",
  "adet",
  "urun",
  "ürün",
  "model",
  "renk",
  "color",
  "bir",
  "bu",
  "su",
  "şu",
  ...INTENT_WORDS,
]);

/** True for tokens like g95nc, ls57cg952, iphone16-ish model codes. */
export function isModelCodeToken(token: string) {
  const t = token.trim().toLowerCase();
  if (t.length < 3) return false;
  const hasLetter = /[a-zğüşıöç]/i.test(t);
  const hasDigit = /\d/.test(t);
  return hasLetter && hasDigit;
}

/**
 * Strip chat fluff so "samsung g95nc özellikleri neler" → "samsung g95nc".
 * Keeps brand + distinctive model tokens.
 */
export function extractProductSearchQuery(raw: string) {
  const normalized = normalizeProductQuery(raw);
  if (!normalized) return "";

  const kept = normalized
    .split(" ")
    .map((t) => t.trim())
    .filter((t) => t.length >= 2 && !STOP_WORDS.has(t) && !INTENT_WORDS.has(t));

  if (kept.length > 0) return kept.join(" ");

  // Fallback: drop only pure intent words, keep the rest
  return normalized
    .split(" ")
    .filter((t) => t.length >= 2 && !INTENT_WORDS.has(t))
    .join(" ")
    .trim();
}

export function significantTokens(value: string) {
  return normalizeProductQuery(value)
    .split(" ")
    .map((t) => t.trim())
    .filter((t) => t.length >= 2 && !STOP_WORDS.has(t));
}

export type RankableProduct = {
  name: string;
  sku?: string | null;
  slug?: string | null;
  soldCount?: number | null;
  isFeatured?: boolean | null;
};

export function scoreProductMatch(query: string, row: RankableProduct) {
  const cleaned = extractProductSearchQuery(query) || query;
  const tokens = significantTokens(cleaned);
  const normalizedQuery = normalizeProductQuery(cleaned);
  const name = normalizeProductQuery(row.name);
  const sku = normalizeProductQuery(row.sku ?? "");
  const slug = normalizeProductQuery(row.slug ?? "");

  const tokenHits = tokens.filter(
    (t) => name.includes(t) || sku.includes(t) || slug.includes(t),
  ).length;
  const exactish = name === normalizedQuery || sku === normalizedQuery ? 100 : 0;
  const starts = name.startsWith(normalizedQuery) ? 40 : 0;
  const contains = name.includes(normalizedQuery) ? 35 : 0;
  const skuContains = sku.includes(normalizedQuery) ? 45 : 0;
  // Variant SKUs often look like `${productSku}-BLK` — keep parent discoverable.
  const skuVariantHint =
    sku &&
    (normalizedQuery.startsWith(`${sku}-`) ||
      normalizedQuery.startsWith(sku) ||
      sku.startsWith(normalizedQuery))
      ? 70
      : 0;

  // Strong boost when a distinctive model code (G95NC) appears in name/sku/slug.
  const modelTokens = tokens.filter(isModelCodeToken);
  const modelHits = modelTokens.filter(
    (t) => name.includes(t) || sku.includes(t) || slug.includes(t),
  ).length;
  const modelBoost = modelHits > 0 ? 80 + modelHits * 20 : 0;

  const coverage = tokens.length > 0 ? (tokenHits / tokens.length) * 50 : 0;
  // Don't punish short brand+model queries against long catalog titles.
  const lengthPenalty =
    modelHits > 0
      ? Math.min(12, Math.abs(name.length - normalizedQuery.length) / 4)
      : Math.min(40, Math.abs(name.length - normalizedQuery.length));
  const popularity = Math.min(8, Number(row.soldCount ?? 0) / 10);
  const featured = row.isFeatured ? 3 : 0;

  return (
    exactish +
    starts +
    contains +
    skuContains +
    skuVariantHint +
    modelBoost +
    tokenHits * 20 +
    coverage +
    popularity +
    featured -
    lengthPenalty
  );
}

/** Rank candidates; drop weak single-token / color-only matches. */
export function rankProductMatches<T extends RankableProduct>(
  query: string,
  rows: T[],
  opts?: { minScore?: number },
): Array<T & { matchScore: number }> {
  const cleaned = extractProductSearchQuery(query) || query;
  const tokens = significantTokens(cleaned);
  const minScore = opts?.minScore ?? 20;

  const ranked = rows
    .map((row) => ({
      ...row,
      matchScore: scoreProductMatch(query, row),
    }))
    .sort((a, b) => b.matchScore - a.matchScore);

  return ranked.filter((row) => {
    if (row.matchScore >= minScore) return true;
    const name = normalizeProductQuery(row.name);
    const tokenHits = tokens.filter((t) => name.includes(t)).length;
    if (tokenHits >= 2) return true;
    // Distinctive model code alone is enough (e.g. g95nc).
    return tokens.some(
      (t) => isModelCodeToken(t) && name.includes(t),
    );
  });
}

export function pickBestProductMatch<T extends RankableProduct>(
  query: string,
  rows: T[],
): T | null {
  if (rows.length === 0) return null;
  if (rows.length === 1) return rows[0] ?? null;
  const ranked = rankProductMatches(query, rows);
  return ranked[0] ?? null;
}
