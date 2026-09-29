import "server-only";

import {
  isSafePublicImageUrl,
  upgradeToFullSizeImageUrl,
} from "@/lib/barcode/parse";
import type { ProductDraft } from "@/lib/barcode/types";

const USER_AGENT = "Boravin/1.0 (admin barcode import; +https://www.boravin.com)";
export const MIN_PRODUCT_IMAGES = 3;

export { upgradeToFullSizeImageUrl };

function isLikelyTinyThumb(url: string): boolean {
  const lower = url.toLowerCase();
  if (/[._-](thumb|small|tiny|icon|50x|64x|75x|80x|96x|100x|120x|150x|200x)[._/-]/i.test(lower)) {
    return true;
  }
  if (/\.(100|200)\.(jpe?g|png|webp)(\?|$)/i.test(lower)) return true;
  if (/=s(2|3|4|5|6|7|8|9)\d{1,2}(-|$)/i.test(lower)) return true;
  return false;
}

export function normalizeProductImageUrls(urls: string[], limit = 8): string[] {
  const seen = new Set<string>();
  const preferred: string[] = [];
  const fallback: string[] = [];

  for (const raw of urls) {
    if (!raw) continue;
    const upgraded = upgradeToFullSizeImageUrl(raw);
    if (!isSafePublicImageUrl(upgraded) || seen.has(upgraded)) continue;
    if (/\.svg(\?|$)/i.test(upgraded)) continue;
    if (/logo|icon|sprite|avatar|favicon|pixel|1x1/i.test(upgraded)) continue;
    seen.add(upgraded);
    if (isLikelyTinyThumb(upgraded)) fallback.push(upgraded);
    else preferred.push(upgraded);
  }

  return [...preferred, ...fallback].slice(0, limit);
}

type SerperImage = {
  imageUrl?: string;
  thumbnailUrl?: string;
  title?: string;
  imageWidth?: number;
  imageHeight?: number;
};

async function searchSerperProductImages(
  query: string,
  need: number,
): Promise<string[]> {
  const key = process.env.SERPER_API_KEY?.trim();
  if (!key || need <= 0) return [];

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 9000);
  try {
    const response = await fetch("https://google.serper.dev/images", {
      method: "POST",
      signal: controller.signal,
      headers: {
        "Content-Type": "application/json",
        "X-API-KEY": key,
      },
      body: JSON.stringify({
        q: query,
        gl: "tr",
        hl: "tr",
        num: Math.min(12, Math.max(6, need + 4)),
      }),
    });
    if (!response.ok) return [];
    const body = (await response.json().catch(() => null)) as {
      images?: SerperImage[];
    } | null;
    const rows = [...(body?.images ?? [])].sort((a, b) => {
      const areaA = (a.imageWidth ?? 0) * (a.imageHeight ?? 0);
      const areaB = (b.imageWidth ?? 0) * (b.imageHeight ?? 0);
      return areaB - areaA;
    });

    const out: string[] = [];
    for (const row of rows) {
      const candidate = row.imageUrl || row.thumbnailUrl;
      if (!candidate) continue;
      const w = row.imageWidth ?? 0;
      const h = row.imageHeight ?? 0;
      // Skip clearly tiny assets when dimensions are known.
      if (w > 0 && h > 0 && (w < 400 || h < 400)) continue;
      out.push(candidate);
      if (out.length >= need + 2) break;
    }
    return normalizeProductImageUrls(out, need + 2);
  } catch {
    return [];
  } finally {
    clearTimeout(timer);
  }
}

async function fetchOgImagesFromQueryPages(
  query: string,
  need: number,
): Promise<string[]> {
  if (need <= 0) return [];
  const key = process.env.SERPER_API_KEY?.trim();
  if (!key) return [];

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 8000);
  try {
    const response = await fetch("https://google.serper.dev/search", {
      method: "POST",
      signal: controller.signal,
      headers: {
        "Content-Type": "application/json",
        "X-API-KEY": key,
      },
      body: JSON.stringify({
        q: query,
        gl: "tr",
        hl: "tr",
        num: 5,
      }),
    });
    if (!response.ok) return [];
    const body = (await response.json().catch(() => null)) as {
      organic?: Array<{ link?: string }>;
    } | null;
    const links = (body?.organic ?? [])
      .map((row) => row.link)
      .filter((u): u is string => Boolean(u && /^https:/i.test(u)))
      .slice(0, 4);

    const images: string[] = [];
    await Promise.all(
      links.map(async (pageUrl) => {
        try {
          const pageController = new AbortController();
          const pageTimer = setTimeout(() => pageController.abort(), 5000);
          const pageRes = await fetch(pageUrl, {
            signal: pageController.signal,
            headers: {
              Accept: "text/html,application/xhtml+xml",
              "User-Agent": USER_AGENT,
            },
            redirect: "follow",
            cache: "no-store",
          });
          clearTimeout(pageTimer);
          if (!pageRes.ok) return;
          const html = await pageRes.text();
          const og =
            html.match(
              /<meta[^>]+(?:property|name)=["'](?:og:image|og:image:url|twitter:image)["'][^>]+content=["']([^"']+)["']/i,
            )?.[1] ||
            html.match(
              /<meta[^>]+content=["']([^"']+)["'][^>]+(?:property|name)=["'](?:og:image|twitter:image)["']/i,
            )?.[1];
          if (!og) return;
          const absolute = new URL(og, pageUrl).toString();
          images.push(absolute);
        } catch {
          // ignore page
        }
      }),
    );
    return normalizeProductImageUrls(images, need + 1);
  } catch {
    return [];
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Ensure a draft has at least `min` full-size product images (Serper + page OG).
 * Safe no-op when already enough images or network is unavailable.
 */
export async function ensureMinProductImages(
  draft: ProductDraft,
  barcode: string,
  min = MIN_PRODUCT_IMAGES,
): Promise<ProductDraft> {
  let imageUrls = normalizeProductImageUrls(draft.imageUrls);
  if (imageUrls.length >= min) {
    return withImages(draft, imageUrls);
  }

  const title = draft.name.replace(/\s+/g, " ").trim();
  const brand = draft.brand.replace(/\s+/g, " ").trim();
  const queries = [
    [brand, title, "ürün"].filter(Boolean).join(" "),
    [title, barcode].filter(Boolean).join(" "),
    `${barcode} product`,
  ].filter((q, index, all) => q.length >= 6 && all.indexOf(q) === index);

  for (const query of queries) {
    if (imageUrls.length >= min) break;
    const need = min - imageUrls.length;
    const found = await searchSerperProductImages(query, need);
    imageUrls = normalizeProductImageUrls([...imageUrls, ...found]);
  }

  if (imageUrls.length < min && title) {
    const need = min - imageUrls.length;
    const pageImages = await fetchOgImagesFromQueryPages(
      [brand, title].filter(Boolean).join(" "),
      need,
    );
    imageUrls = normalizeProductImageUrls([...imageUrls, ...pageImages]);
  }

  return withImages(draft, imageUrls);
}

function withImages(draft: ProductDraft, imageUrls: string[]): ProductDraft {
  const urls = normalizeProductImageUrls(imageUrls);
  const missing = draft.missing.filter((item) => item !== "Ürün görseli");
  if (!urls.length) missing.push("Ürün görseli");
  return { ...draft, imageUrls: urls, missing };
}
