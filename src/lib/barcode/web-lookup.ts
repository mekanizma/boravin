import "server-only";

import { GoogleGenerativeAI } from "@google/generative-ai";
import { geminiApiKey, geminiModel, geminiRequestOptions } from "@/lib/ai/gemini-env";
import {
  enrichImagesFromGoogleHits,
  extractBrandFromSnippet,
  searchGoogleHeadless,
} from "@/lib/barcode/google-headless";
import {
  isSafePublicImageUrl,
  mapWebSearchProduct,
} from "@/lib/barcode/parse";
import { ensureMinProductImages } from "@/lib/barcode/product-images";
import type { ProductDraft } from "@/lib/barcode/types";

const USER_AGENT = "Boravin/1.0 (admin barcode import; +https://www.boravin.com)";

type WebHit = {
  title?: string;
  brand?: string;
  category?: string;
  description?: string;
  shortDescription?: string;
  model?: string;
  imageUrls?: string[];
  pageUrls?: string[];
};

function extractJsonObject(text: string): Record<string, unknown> | null {
  const trimmed = text.trim();
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const raw = fenced?.[1]?.trim() ?? trimmed;
  const start = raw.indexOf("{");
  const end = raw.lastIndexOf("}");
  if (start < 0 || end <= start) return null;
  try {
    return JSON.parse(raw.slice(start, end + 1)) as Record<string, unknown>;
  } catch {
    return null;
  }
}

function asString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function hitToDraft(
  hit: WebHit,
  barcode: string,
  source: "google" | "duckduckgo" | "wikidata",
): ProductDraft | null {
  return mapWebSearchProduct(
    {
      name: hit.title,
      brand: hit.brand,
      category: hit.category,
      shortDescription: hit.shortDescription,
      description: hit.description,
      model: hit.model,
      imageUrls: hit.imageUrls,
    },
    barcode,
    source,
  );
}

async function fetchText(url: string, timeoutMs = 10000): Promise<string | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        Accept: "text/html,application/xhtml+xml,application/json",
        "User-Agent": USER_AGENT,
      },
      redirect: "follow",
      cache: "no-store",
    });
    if (!response.ok) return null;
    return await response.text();
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

async function fetchJson(url: string, timeoutMs = 10000): Promise<unknown | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        Accept: "application/json",
        "User-Agent": USER_AGENT,
      },
      cache: "no-store",
    });
    if (!response.ok) return null;
    return (await response.json().catch(() => null)) as unknown;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

function pickMeta(html: string, keys: string[]): string | null {
  for (const key of keys) {
    const prop = new RegExp(
      `<meta[^>]+(?:property|name)=["']${key}["'][^>]+content=["']([^"']+)["']`,
      "i",
    );
    const propAlt = new RegExp(
      `<meta[^>]+content=["']([^"']+)["'][^>]+(?:property|name)=["']${key}["']`,
      "i",
    );
    const match = html.match(prop) ?? html.match(propAlt);
    if (match?.[1]) return match[1].trim();
  }
  return null;
}

async function enrichImagesFromPages(pageUrls: string[]): Promise<string[]> {
  const images: string[] = [];
  for (const pageUrl of pageUrls.slice(0, 3)) {
    try {
      const url = new URL(pageUrl);
      if (url.protocol !== "https:") continue;
      if (url.username || url.password) continue;
    } catch {
      continue;
    }
    const html = await fetchText(pageUrl, 8000);
    if (!html) continue;
    const og =
      pickMeta(html, ["og:image", "og:image:url", "twitter:image", "twitter:image:src"]) ??
      "";
    if (og) {
      try {
        const absolute = new URL(og, pageUrl).toString();
        if (isSafePublicImageUrl(absolute)) images.push(absolute);
      } catch {
        // ignore bad meta urls
      }
    }
  }
  return [...new Set(images)].slice(0, 4);
}

/** Wikidata GTIN / barcode entities often include label, brand and Commons image. */
export async function lookupWikidata(barcode: string): Promise<ProductDraft | null> {
  const query = `
SELECT ?item ?itemLabel ?brandLabel ?image ?desc WHERE {
  VALUES ?code { "${barcode.replace(/"/g, "")}" }
  ?item (wdt:P3962|wdt:P297|wdt:P8194|wdt:P4969) ?code .
  OPTIONAL { ?item wdt:P18 ?image. }
  OPTIONAL { ?item wdt:P1716 ?brand. }
  OPTIONAL { ?item schema:description ?desc. FILTER(LANG(?desc) = "tr" || LANG(?desc) = "en") }
  SERVICE wikibase:label { bd:serviceParam wikibase:language "tr,en". }
}
LIMIT 3`.trim();

  const url = `https://query.wikidata.org/sparql?format=json&query=${encodeURIComponent(query)}`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 12000);
  type WikiPayload = {
    results?: {
      bindings?: Array<{
        itemLabel?: { value?: string };
        brandLabel?: { value?: string };
        image?: { value?: string };
        desc?: { value?: string };
      }>;
    };
  };
  let payload: WikiPayload | null = null;
  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        Accept: "application/sparql-results+json",
        "User-Agent": USER_AGENT,
      },
      cache: "no-store",
    });
    if (response.ok) {
      payload = (await response.json().catch(() => null)) as WikiPayload | null;
    }
  } catch {
    payload = null;
  } finally {
    clearTimeout(timer);
  }
  if (!payload) return null;
  const row = payload.results?.bindings?.[0];
  if (!row?.itemLabel?.value) return null;
  const image = row.image?.value
    ? row.image.value.replace(/^http:/, "https:")
    : undefined;
  return hitToDraft(
    {
      title: row.itemLabel.value,
      brand: row.brandLabel?.value,
      description: row.desc?.value,
      shortDescription: row.desc?.value,
      imageUrls: image ? [image] : [],
    },
    barcode,
    "wikidata",
  );
}

/** DuckDuckGo instant answer + related topics (no API key). */
export async function lookupDuckDuckGo(barcode: string): Promise<ProductDraft | null> {
  const q = `${barcode} product barcode`;
  const url = `https://api.duckduckgo.com/?q=${encodeURIComponent(q)}&format=json&no_redirect=1&no_html=1&skip_disambig=1`;
  const payload = (await fetchJson(url, 10000)) as {
    Heading?: string;
    AbstractText?: string;
    AbstractURL?: string;
    Image?: string;
    RelatedTopics?: Array<{ Text?: string; FirstURL?: string; Icon?: { URL?: string } }>;
  } | null;
  if (!payload) return null;

  const related = (payload.RelatedTopics ?? []).filter((item) => item.Text);
  const title =
    payload.Heading ||
    related[0]?.Text?.split(" - ")[0] ||
    related[0]?.Text?.slice(0, 120) ||
    "";
  const description =
    payload.AbstractText ||
    related
      .slice(0, 2)
      .map((item) => item.Text)
      .filter(Boolean)
      .join("\n\n") ||
    "";
  const pageUrls = [
    payload.AbstractURL,
    ...related.map((item) => item.FirstURL),
  ].filter((u): u is string => Boolean(u));

  const imageCandidates = [
    payload.Image
      ? payload.Image.startsWith("http")
        ? payload.Image
        : `https://duckduckgo.com${payload.Image}`
      : "",
    ...related.map((item) => item.Icon?.URL).filter((u): u is string => Boolean(u)),
  ].filter(Boolean);

  const pageImages = await enrichImagesFromPages(pageUrls);
  const imageUrls = [...imageCandidates, ...pageImages].filter((u) =>
    isSafePublicImageUrl(u),
  );

  if (!title && !description && !imageUrls.length) return null;
  return hitToDraft(
    {
      title: title || `Ürün ${barcode}`,
      description,
      shortDescription: description.slice(0, 180),
      imageUrls,
      pageUrls,
    },
    barcode,
    "duckduckgo",
  );
}

/** Serper.dev Google organic + images (optional SERPER_API_KEY). */
export async function lookupSerperGoogle(barcode: string): Promise<ProductDraft | null> {
  const key = process.env.SERPER_API_KEY?.trim();
  if (!key) return null;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 12000);
  try {
    const [organicRes, imageRes] = await Promise.all([
      fetch("https://google.serper.dev/search", {
        method: "POST",
        signal: controller.signal,
        headers: {
          "Content-Type": "application/json",
          "X-API-KEY": key,
        },
        body: JSON.stringify({
          q: `${barcode} ürün barkod`,
          gl: "tr",
          hl: "tr",
          num: 5,
        }),
      }),
      fetch("https://google.serper.dev/images", {
        method: "POST",
        signal: controller.signal,
        headers: {
          "Content-Type": "application/json",
          "X-API-KEY": key,
        },
        body: JSON.stringify({
          q: `${barcode} ürün`,
          gl: "tr",
          hl: "tr",
          num: 10,
        }),
      }),
    ]);

    const organic = (await organicRes.json().catch(() => null)) as {
      organic?: Array<{ title?: string; snippet?: string; link?: string }>;
      knowledgeGraph?: {
        title?: string;
        description?: string;
        imageUrl?: string;
        attributes?: Record<string, string>;
      };
    } | null;
    const images = (await imageRes.json().catch(() => null)) as {
      images?: Array<{
        imageUrl?: string;
        thumbnailUrl?: string;
        title?: string;
        imageWidth?: number;
        imageHeight?: number;
      }>;
    } | null;

    if (!organicRes.ok && !imageRes.ok) return null;

    const kg = organic?.knowledgeGraph;
    const first = organic?.organic?.[0];
    const title = kg?.title || first?.title || "";
    const description =
      kg?.description ||
      organic?.organic
        ?.slice(0, 3)
        .map((row) => row.snippet)
        .filter(Boolean)
        .join("\n\n") ||
      "";
    const brand = kg?.attributes?.Brand || kg?.attributes?.Marka || "";
    const rankedImages = [...(images?.images ?? [])].sort((a, b) => {
      const areaA = (a.imageWidth ?? 0) * (a.imageHeight ?? 0);
      const areaB = (b.imageWidth ?? 0) * (b.imageHeight ?? 0);
      return areaB - areaA;
    });
    const imageUrls = [
      kg?.imageUrl,
      ...rankedImages
        .filter((row) => {
          const w = row.imageWidth ?? 0;
          const h = row.imageHeight ?? 0;
          if (w > 0 && h > 0 && (w < 400 || h < 400)) return false;
          return Boolean(row.imageUrl || row.thumbnailUrl);
        })
        .map((row) => row.imageUrl || row.thumbnailUrl),
    ].filter((u): u is string => Boolean(u));

    const pageImages = await enrichImagesFromPages(
      (organic?.organic ?? []).map((row) => row.link).filter((u): u is string => Boolean(u)),
    );

    if (!title && !description && !imageUrls.length && !pageImages.length) return null;
    return hitToDraft(
      {
        title: title || `Ürün ${barcode}`,
        brand,
        description,
        shortDescription: description.slice(0, 180),
        imageUrls: [...imageUrls, ...pageImages],
      },
      barcode,
      "google",
    );
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Google organic search via local Chrome/Edge — finds retail GTINs that public
 * catalogs miss (same results the admin sees when searching Google).
 */
export async function lookupGoogleHeadless(barcode: string): Promise<ProductDraft | null> {
  try {
    const hits = await searchGoogleHeadless(barcode);
    if (!hits.length) return null;

    const best =
      hits.find((hit) => hit.snippet.includes(barcode)) ||
      hits.find((hit) => /xenon/i.test(hit.title) && /kamera|camera|security|güvenlik|ptz/i.test(hit.title)) ||
      hits.find((hit) => /kamera|camera|xenon|security|güvenlik/i.test(hit.title) && hit.title.length > 12) ||
      hits.find((hit) => hit.title.length > 8) ||
      hits[0];
    if (!best) return null;

    const title = best.title
      .replace(/\s*[|–-]\s*(?:Ubuy|Amazon|Trendyol|Hepsiburada|OnuAl|Prices|Features(?: and Reviews)?).*$/i, "")
      .replace(/\s+Prices,?\s*Features(?:\s+and\s+Reviews)?.*$/i, "")
      .replace(/\s*\.\.\.\s*$/g, "")
      .replace(/\s+/g, " ")
      .trim();
    const brand = extractBrandFromSnippet(best.snippet, title);
    const snippetClean = best.snippet.replace(/\s+/g, " ").trim().slice(0, 400);
    const description =
      snippetClean ||
      `${title}${brand ? ` — ${brand}` : ""}. Barkod: ${barcode}.`;
    const shortDescription = `${title}${brand ? ` (${brand})` : ""}`.slice(0, 180);
    const pageUrls = hits
      .map((hit) => hit.url)
      .filter((url) => /^https:\/\//i.test(url) && /\/products?\//i.test(url));
    // Image scrape can take a few seconds (official shop OG + DDG fallback).
    const imageUrls =
      (await Promise.race([
        enrichImagesFromGoogleHits(
          hits.filter((hit) =>
            hit.snippet.includes(barcode) ||
            /\/products?\//i.test(hit.url) ||
            /xenon|camera|kamera|security|güvenlik|ptz|shop\./i.test(`${hit.title} ${hit.url}`),
          ),
          title,
        ),
        new Promise<string[]>((resolve) => setTimeout(() => resolve([]), 5000)),
      ])) ?? [];

    return hitToDraft(
      {
        title,
        brand,
        category: /kamera|camera|güvenlik|security/i.test(`${title} ${description}`)
          ? "Güvenlik Kamerası"
          : "",
        shortDescription,
        description: /[<>]/.test(description)
          ? `${title}${brand ? ` — ${brand}` : ""}. Barkod: ${barcode}.`
          : description,
        imageUrls,
        pageUrls,
      },
      barcode,
      "google",
    );
  } catch (error) {
    console.error(
      "[barcode-google]",
      error instanceof Error ? error.message : "Web barkod araması başarısız",
    );
    return null;
  }
}

/**
 * Gemini free-tier lookup. Fast timeout — runs in parallel with other fallbacks.
 */
export async function lookupGeminiGoogle(barcode: string): Promise<ProductDraft | null> {
  const apiKey = geminiApiKey();
  if (!apiKey) return null;

  const modelName = geminiModel();
  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel(
    {
      model: modelName,
      generationConfig: {
        temperature: 0,
        maxOutputTokens: 768,
        responseMimeType: "application/json",
      },
    },
    geminiRequestOptions(9000),
  );

  const prompt = `Barkod/GTIN ${barcode} için bildiğin perakende ürününü yaz.
Türkçe tercih et. Sadece geçerli JSON döndür:
{"name":"ürün adı","brand":"marka","category":"kategori","shortDescription":"kısa özet","description":"ürün açıklaması","model":"model kodu","imageUrls":[]}
Emin değilsen bütün alanları boş string ve imageUrls boş dizi yap. Barkoddan ürün uydurma. imageUrls boş bırak; görseller ayrıca aranır.`;

  try {
    const result = await model.generateContent(prompt);
    const parsed = extractJsonObject(result.response.text() ?? "");
    if (!parsed) return null;
    const name = asString(parsed.name);
    if (!name || name.replace(/\D/g, "") === barcode) return null;
    const draft = hitToDraft(
      {
        title: name,
        brand: asString(parsed.brand),
        category: asString(parsed.category),
        shortDescription: asString(parsed.shortDescription),
        description: asString(parsed.description),
        model: asString(parsed.model),
        imageUrls: [],
      },
      barcode,
      "google",
    );
    if (!draft) return null;
    return draft;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Gemini barkod sorgusu başarısız";
    console.error("[barcode-gemini]", message);
    return null;
  }
}

async function firstSettledDraft(
  tasks: Array<() => Promise<ProductDraft | null>>,
): Promise<ProductDraft | null> {
  if (!tasks.length) return null;
  return await new Promise<ProductDraft | null>((resolve) => {
    let pending = tasks.length;
    let settled = false;
    for (const task of tasks) {
      void task()
        .then((draft) => {
          if (settled) return;
          if (draft) {
            settled = true;
            resolve(draft);
            return;
          }
          pending -= 1;
          if (pending <= 0) resolve(null);
        })
        .catch(() => {
          if (settled) return;
          pending -= 1;
          if (pending <= 0) resolve(null);
        });
    }
  });
}

/** Parallel web + Gemini fallbacks after public barcode catalogs miss. */
export async function lookupWebFallbacks(barcode: string): Promise<{
  draft: ProductDraft | null;
  networkError: boolean;
}> {
  let networkError = false;

  const draft = await Promise.race([
    firstSettledDraft([
      () => lookupGeminiGoogle(barcode),
      () =>
        lookupSerperGoogle(barcode).catch(() => {
          networkError = true;
          return null;
        }),
      () =>
        lookupWikidata(barcode).catch(() => {
          networkError = true;
          return null;
        }),
      () =>
        lookupGoogleHeadless(barcode).catch(() => {
          networkError = true;
          return null;
        }),
      () =>
        lookupDuckDuckGo(barcode).catch(() => {
          networkError = true;
          return null;
        }),
    ]),
    new Promise<null>((resolve) => setTimeout(() => resolve(null), 11_000)),
  ]);

  if (draft) {
    const enriched = await ensureMinProductImages(draft, barcode, 3);
    return { draft: enriched, networkError: false };
  }
  return { draft: null, networkError };
}
