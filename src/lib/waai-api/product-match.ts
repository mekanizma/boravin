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
]);

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
  const tokens = significantTokens(query);
  const normalizedQuery = normalizeProductQuery(query);
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
  const coverage = tokens.length > 0 ? (tokenHits / tokens.length) * 50 : 0;
  const lengthPenalty = Math.min(
    40,
    Math.abs(name.length - normalizedQuery.length),
  );
  const popularity = Math.min(8, Number(row.soldCount ?? 0) / 10);
  const featured = row.isFeatured ? 3 : 0;

  return (
    exactish +
    starts +
    contains +
    skuContains +
    skuVariantHint +
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
  const tokens = significantTokens(query);
  const minScore = opts?.minScore ?? 20;

  const ranked = rows
    .map((row) => ({
      ...row,
      matchScore: scoreProductMatch(query, row),
    }))
    .sort((a, b) => b.matchScore - a.matchScore);

  return ranked.filter((row) => {
    if (row.matchScore >= minScore) return true;
    const tokenHits = tokens.filter((t) =>
      normalizeProductQuery(row.name).includes(t),
    ).length;
    return tokenHits >= 2;
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
