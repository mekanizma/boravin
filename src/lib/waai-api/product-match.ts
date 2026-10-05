/** Shared WhatsApp / Waai product query normalization and ranking. */

export const MAX_SEARCH_QUERY_LENGTH = 200;

/** Strip LIKE wildcards from user input (parameterized ILIKE still needs this). */
export function sanitizeLikeToken(value: string) {
  return value.replace(/[%_\\]/g, "").trim();
}

export function clampSearchQuery(value: string) {
  return value.trim().slice(0, MAX_SEARCH_QUERY_LENGTH);
}

export function normalizeProductQuery(value: string) {
  return value
    .toLocaleLowerCase("tr-TR")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    // Treat common separators as token breaks (keep alnum + Turkish letters).
    .replace(/[-_/\\|.,;:!?()[\]{}'"`~+=*]+/g, " ")
    .replace(/[^a-z0-9ğüşıöç\s]/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Multi-word chat fluff removed before tokenization (non-aggressive). */
const STOP_PHRASES = [
  "ozellikleri nedir",
  "ozellikleri neler",
  "ozellikleri nelerdir",
  "ozellikleri ne",
  "fiyati nedir",
  "fiyatı nedir",
  "tell me about",
  "do you have",
  "stokta mi",
  "stokta mı",
  "var mi",
  "var mı",
  "specifications",
  "ozellikleri",
  "özellikleri",
  "ozellikler",
  "özellikler",
  "ozellik",
  "özellik",
  "specs",
  "features",
  "nelerdir",
  "nedir",
  "neler",
  "fiyati",
  "fiyatı",
  "fiyat",
  "hakkinda",
  "hakkında",
  "available",
  "goster",
  "göster",
  "ariyorum",
  "arıyorum",
  "bul",
  "price",
  "spec",
] as const;

const INTENT_WORDS = new Set([
  "ozellik",
  "ozellikleri",
  "ozellikler",
  "özellik",
  "özellikleri",
  "özellikler",
  "spec",
  "specs",
  "specifications",
  "features",
  "nedir",
  "neler",
  "nelerdir",
  "ne",
  "kadar",
  "fiyat",
  "fiyati",
  "fiyatı",
  "price",
  "stok",
  "stogu",
  "stoğu",
  "var",
  "mi",
  "mı",
  "mu",
  "mü",
  "varmi",
  "hakkinda",
  "hakkında",
  "about",
  "detay",
  "detayli",
  "detaylı",
  "anlat",
  "goster",
  "göster",
  "bul",
  "ariyorum",
  "arıyorum",
  "available",
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
  "a",
  "an",
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

function isLetterToken(token: string) {
  return /^[a-zğüşıöç]+$/i.test(token);
}

function isDigitToken(token: string) {
  return /^\d+$/.test(token);
}

/** True for tokens like g95nc, 14t, a55, g10, rtx5070. */
export function isModelCodeToken(token: string) {
  const t = token.trim().toLowerCase();
  if (t.length < 2 || t.length > 32) return false;
  const hasLetter = /[a-zğüşıöç]/i.test(t);
  const hasDigit = /\d/.test(t);
  return hasLetter && hasDigit;
}

export type ModelSignal = {
  /** Compact form, e.g. rtx5070 or g95nc */
  joined: string;
  /** Parts that should all appear for a spaced model like "rtx 5070" */
  parts: string[];
};

/**
 * Distinctive model signals from query tokens.
 * Handles G95NC, RTX5070, and spaced forms like "RTX 5070" / "250 G10".
 */
export function extractModelSignals(tokens: string[]): ModelSignal[] {
  const signals: ModelSignal[] = [];
  const seen = new Set<string>();

  const push = (joined: string, parts: string[]) => {
    const key = joined.toLowerCase();
    if (!key || seen.has(key)) return;
    seen.add(key);
    signals.push({ joined: key, parts: parts.map((p) => p.toLowerCase()) });
  };

  for (const token of tokens) {
    if (isModelCodeToken(token)) push(token, [token]);
  }

  for (let i = 0; i < tokens.length - 1; i++) {
    const a = tokens[i]!;
    const b = tokens[i + 1]!;
    if (isLetterToken(a) && isDigitToken(b) && a.length >= 2) {
      // rtx + 5070 → rtx5070
      push(`${a}${b}`, [a, b]);
    } else if (isDigitToken(a) && isModelCodeToken(b)) {
      // 250 + g10 → 250g10 (+ keep g10)
      push(`${a}${b}`, [a, b]);
    } else if (isDigitToken(a) && isLetterToken(b) && b.length <= 3) {
      // 250 + g → weak; skip. 14 + t handled as single token 14t.
    } else if (isModelCodeToken(a) && isDigitToken(b)) {
      push(`${a}${b}`, [a, b]);
    }
  }

  return signals;
}

export function extractModelTokens(tokens: string[]): string[] {
  return extractModelSignals(tokens).map((s) => s.joined);
}

function stripStopPhrases(normalized: string) {
  let result = ` ${normalized} `;
  for (const phrase of STOP_PHRASES) {
    const folded = normalizeProductQuery(phrase);
    if (!folded) continue;
    result = result.split(` ${folded} `).join(" ");
  }
  return result.replace(/\s+/g, " ").trim();
}

/**
 * Strip chat fluff so "samsung g95nc özellikleri neler" → "samsung g95nc".
 * Never drops model-code tokens.
 */
export function extractProductSearchQuery(raw: string) {
  const clamped = clampSearchQuery(raw);
  const normalized = normalizeProductQuery(clamped);
  if (!normalized) return "";

  const withoutPhrases = stripStopPhrases(normalized) || normalized;
  const parts = withoutPhrases.split(" ").map((t) => t.trim()).filter(Boolean);

  const kept = parts.filter(
    (t) =>
      t.length >= 2 &&
      (isModelCodeToken(t) || isDigitToken(t) || !STOP_WORDS.has(t)),
  );

  if (kept.length > 0) return kept.join(" ");

  // Fallback: drop only pure intent words; keep model codes always.
  const fallback = parts
    .filter((t) => t.length >= 2 && (isModelCodeToken(t) || !INTENT_WORDS.has(t)))
    .join(" ")
    .trim();

  return fallback || normalized;
}

export function significantTokens(value: string) {
  return normalizeProductQuery(value)
    .split(" ")
    .map((t) => t.trim())
    .filter((t) => {
      if (t.length < 2) return false;
      if (isModelCodeToken(t) || isDigitToken(t)) return true;
      return !STOP_WORDS.has(t);
    });
}

function textTokens(value: string) {
  return normalizeProductQuery(value).split(" ").filter(Boolean);
}

function hasExactToken(text: string, token: string) {
  return textTokens(text).includes(token);
}

function modelSignalMatches(text: string, signal: ModelSignal) {
  if (hasExactToken(text, signal.joined)) return true;
  // Compact form inside a token (rare sku-like chunks)
  if (textTokens(text).some((t) => t === signal.joined || t.includes(signal.joined))) {
    return signal.joined.length >= 3;
  }
  // Spaced model: all parts present as tokens ("rtx" + "5070")
  if (signal.parts.length > 1) {
    return signal.parts.every((p) => hasExactToken(text, p));
  }
  return false;
}

export type RankableProduct = {
  name: string;
  sku?: string | null;
  slug?: string | null;
  barcode?: string | null;
  brandName?: string | null;
  categoryName?: string | null;
  shortDescription?: string | null;
  description?: string | null;
  stock?: number | null;
  soldCount?: number | null;
  isFeatured?: boolean | null;
  variantSkus?: string[] | null;
  variantNames?: string[] | null;
};

function identityHaystacks(row: RankableProduct) {
  const variantSkus = (row.variantSkus ?? []).map((v) => normalizeProductQuery(v));
  return {
    name: normalizeProductQuery(row.name),
    sku: normalizeProductQuery(row.sku ?? ""),
    slug: normalizeProductQuery(row.slug ?? ""),
    barcode: normalizeProductQuery(row.barcode ?? ""),
    brand: normalizeProductQuery(row.brandName ?? ""),
    category: normalizeProductQuery(row.categoryName ?? ""),
    shortDescription: normalizeProductQuery(row.shortDescription ?? ""),
    description: normalizeProductQuery(row.description ?? ""),
    variantSkus,
    variantNames: (row.variantNames ?? []).map((v) => normalizeProductQuery(v)),
  };
}

export function scoreProductMatch(query: string, row: RankableProduct) {
  const cleaned = extractProductSearchQuery(query) || normalizeProductQuery(query);
  const tokens = significantTokens(cleaned);
  const normalizedQuery = normalizeProductQuery(cleaned);
  const modelSignals = extractModelSignals(tokens);
  const fields = identityHaystacks(row);

  if (!normalizedQuery) return 0;

  // 1–5 Exact identity (highest wins early)
  if (fields.sku && fields.sku === normalizedQuery) return 1000;
  if (fields.variantSkus.some((v) => v === normalizedQuery)) return 980;
  if (fields.barcode && fields.barcode === normalizedQuery) return 950;
  if (fields.slug && fields.slug === normalizedQuery) return 900;
  if (fields.name === normalizedQuery) return 850;

  let score = 0;

  // Variant sku / parent sku prefix hints (BV-MOCK-1035-BLK → parent)
  if (fields.sku) {
    if (
      normalizedQuery.startsWith(`${fields.sku}-`) ||
      fields.sku.startsWith(normalizedQuery) ||
      normalizedQuery.startsWith(fields.sku)
    ) {
      score = Math.max(score, 780);
    }
  }
  if (fields.variantSkus.some((v) => v.includes(normalizedQuery) || normalizedQuery.includes(v))) {
    score = Math.max(score, 760);
  }

  // 6 Substring / prefix on name (stronger than description)
  if (normalizedQuery.length >= 2) {
    if (fields.name.startsWith(normalizedQuery)) score = Math.max(score, 800);
    else if (fields.name.includes(normalizedQuery)) score = Math.max(score, 750);
  }

  // 7 All query tokens in product name
  const nameTokenHits = tokens.filter((t) => fields.name.includes(t)).length;
  const allTokensInName = tokens.length > 0 && nameTokenHits === tokens.length;
  if (allTokensInName) score = Math.max(score, 700);

  // 8–9 Model code + brand
  let modelHit = false;
  for (const signal of modelSignals) {
    if (
      modelSignalMatches(fields.name, signal) ||
      modelSignalMatches(fields.sku, signal) ||
      modelSignalMatches(fields.slug, signal) ||
      fields.variantSkus.some((v) => modelSignalMatches(v, signal))
    ) {
      modelHit = true;
      score += 300;
      break; // one strong model boost is enough
    }
  }

  const brandTokenHit =
    !!fields.brand &&
    tokens.some((t) => t === fields.brand || hasExactToken(fields.brand, t));
  if (brandTokenHit) score += 150;

  if (brandTokenHit && modelHit) {
    score = Math.max(score, 850);
  }

  // Partial name token coverage (never OR-rank weak singles above strong matches)
  if (tokens.length > 0) {
    const coverage = nameTokenHits / tokens.length;
    score += Math.round(coverage * 80);
    score += nameTokenHits * 20;
  }

  // SKU / slug soft contains
  if (fields.sku.includes(normalizedQuery)) score += 45;
  if (fields.slug.includes(normalizedQuery)) score += 30;

  // Category / description — intentionally weak; name always dominates
  if (fields.category && tokens.some((t) => fields.category.includes(t))) {
    score += 40;
  }

  const descHaystack = `${fields.shortDescription} ${fields.description}`.trim();
  const descHits = tokens.filter((t) => descHaystack.includes(t)).length;
  if (descHits > 0) {
    // Cap so description-only noise cannot outrank name matches.
    const descBoost = Math.min(20, descHits * 8);
    if (score >= 100 || allTokensInName || modelHit) {
      score += descBoost;
    } else {
      score += Math.min(20, descBoost);
    }
  }

  // Tiny popularity tie-breakers (must not outweigh model/name)
  score += Math.min(8, Number(row.soldCount ?? 0) / 10);
  if (row.isFeatured) score += 3;

  // Prefer shorter length gap only when we already have a model hit
  if (modelHit) {
    score -= Math.min(12, Math.abs(fields.name.length - normalizedQuery.length) / 8);
  }

  return score;
}

/** Rank candidates; drop weak single-token / color-only matches. */
export function rankProductMatches<T extends RankableProduct>(
  query: string,
  rows: T[],
  opts?: { minScore?: number },
): Array<T & { matchScore: number }> {
  const cleaned = extractProductSearchQuery(query) || normalizeProductQuery(query);
  const tokens = significantTokens(cleaned);
  const modelSignals = extractModelSignals(tokens);
  const minScore = opts?.minScore ?? 50;

  const ranked = rows
    .map((row) => ({
      ...row,
      matchScore: scoreProductMatch(query, row),
    }))
    .sort((a, b) => {
      if (b.matchScore !== a.matchScore) return b.matchScore - a.matchScore;
      const aInStock = Number(a.stock ?? 0) > 0 ? 1 : 0;
      const bInStock = Number(b.stock ?? 0) > 0 ? 1 : 0;
      if (bInStock !== aInStock) return bInStock - aInStock;
      return a.name.localeCompare(b.name, "tr");
    });

  return ranked.filter((row) => {
    if (row.matchScore >= minScore) return true;
    const name = normalizeProductQuery(row.name);
    const tokenHits = tokens.filter((t) => name.includes(t)).length;
    if (tokenHits >= 2 && tokenHits === tokens.length) return true;
    return modelSignals.some((signal) => modelSignalMatches(name, signal));
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
