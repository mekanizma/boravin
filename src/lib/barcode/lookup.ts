import "server-only";

import {
  barcodeCandidates,
  mapIcecatProduct,
  mapOpenFactsProduct,
  mapUpcitemdbHtmlPage,
  mapUpcitemdbProduct,
} from "@/lib/barcode/parse";
import type { ProductDraft } from "@/lib/barcode/types";
import { lookupWebFallbacks } from "@/lib/barcode/web-lookup";
import { ensureMinProductImages } from "@/lib/barcode/product-images";

const USER_AGENT = "Boravin/1.0 (admin barcode import; +https://www.boravin.com)";

export type ExternalLookup = {
  draft: ProductDraft | null;
  offline: boolean;
};

async function fetchJson(url: string, timeoutMs = 3500): Promise<unknown | null> {
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
    const body = (await response.json().catch(() => null)) as unknown;
    if (!response.ok && body == null) return { __httpStatus: response.status };
    return body ?? { __httpStatus: response.status };
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

function icecatUrls(code: string): string[] {
  const username = process.env.ICECAT_USERNAME?.trim();
  const appKey = process.env.ICECAT_APP_KEY?.trim();
  const urls: string[] = [];

  // Prefer Turkish datasheets, then English (many electronics only have EN).
  for (const lang of ["TR", "en"] as const) {
    if (username && appKey) {
      const params = new URLSearchParams({
        UserName: username,
        Language: lang,
        GTIN: code,
        app_key: appKey,
      });
      urls.push(`https://live.icecat.biz/api?${params.toString()}`);
      continue;
    }
    const openParams = new URLSearchParams({
      lang,
      shopname: "openIcecat-live",
      GTIN: code,
      content: "",
    });
    urls.push(`https://live.icecat.biz/api?${openParams.toString()}`);
  }
  return urls;
}

function upcitemdbUrl(code: string) {
  const key = process.env.UPCITEMDB_USER_KEY?.trim();
  if (key) {
    const params = new URLSearchParams({ upc: code });
    return `https://api.upcitemdb.com/prod/v1/lookup?${params.toString()}`;
  }
  return `https://api.upcitemdb.com/prod/trial/lookup?upc=${encodeURIComponent(code)}`;
}

async function fetchUpcitemdb(code: string): Promise<unknown | null> {
  const key = process.env.UPCITEMDB_USER_KEY?.trim();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 3500);
  try {
    const response = await fetch(upcitemdbUrl(code), {
      signal: controller.signal,
      headers: {
        Accept: "application/json",
        "User-Agent": USER_AGENT,
        ...(key ? { user_key: key, key_type: "3scale" } : {}),
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

/** Public HTML page — works when the JSON trial API returns 429. */
async function scrapeUpcitemdbPage(
  code: string,
  barcode: string,
): Promise<ProductDraft | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 7000);
  try {
    const response = await fetch(
      `https://www.upcitemdb.com/upc/${encodeURIComponent(code)}`,
      {
        signal: controller.signal,
        headers: {
          Accept: "text/html,application/xhtml+xml",
          "User-Agent": USER_AGENT,
        },
        redirect: "follow",
        cache: "no-store",
      },
    );
    if (!response.ok) return null;
    const html = await response.text();
    return mapUpcitemdbHtmlPage(html, barcode);
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

function factsUrl(host: string, code: string) {
  const fields = [
    "product_name",
    "product_name_tr",
    "product_name_en",
    "generic_name",
    "generic_name_tr",
    "brands",
    "categories",
    "quantity",
    "ingredients_text",
    "ingredients_text_tr",
    "image_front_url",
    "image_url",
    "selected_images",
    "code",
  ].join(",");
  return `https://${host}/api/v2/product/${encodeURIComponent(code)}.json?fields=${fields}`;
}

async function firstDraft(
  codes: string[],
  tryCode: (code: string) => Promise<{ draft: ProductDraft | null; networkError: boolean }>,
): Promise<{ draft: ProductDraft | null; sawResponse: boolean; sawNetworkError: boolean }> {
  let sawResponse = false;
  let sawNetworkError = false;
  for (const code of codes) {
    const result = await tryCode(code);
    if (result.networkError) {
      sawNetworkError = true;
      continue;
    }
    sawResponse = true;
    if (result.draft) return { draft: result.draft, sawResponse, sawNetworkError };
  }
  return { draft: null, sawResponse, sawNetworkError };
}

function isIcecatMiss(payload: unknown): boolean {
  const body = payload as { msg?: string; Message?: string; Code?: number };
  if (body?.msg === "OK") return false;
  if (body?.Code === 400) return true;
  return /GTIN can not be found/i.test(body?.Message ?? "");
}

async function lookupOpenFacts(
  host: string,
  source: "openproductsfacts" | "openfoodfacts" | "openbeautyfacts",
  codes: string[],
  barcode: string,
): Promise<{ draft: ProductDraft | null; sawResponse: boolean; sawNetworkError: boolean }> {
  let sawResponse = false;
  let sawNetworkError = false;
  for (const code of codes) {
    const payload = await fetchJson(factsUrl(host, code));
    if (payload == null) {
      sawNetworkError = true;
      continue;
    }
    sawResponse = true;
    const draft = mapOpenFactsProduct(payload, barcode, source);
    if (draft) return { draft, sawResponse, sawNetworkError };
  }
  return { draft: null, sawResponse, sawNetworkError };
}

function isSolidCatalogHit(draft: ProductDraft | null | undefined): draft is ProductDraft {
  if (!draft) return false;
  // Brand-only / empty OFF stubs must not block web/Gemini fallbacks.
  return Boolean(draft.name.trim());
}

/**
 * Live lookup against free public catalogs, then web/Gemini fallbacks.
 * Catalogs + web start together; first solid hit wins under a tight budget.
 */
export async function lookupBarcodeExternal(barcode: string): Promise<ExternalLookup> {
  const codes = barcodeCandidates(barcode);

  const catalogPromise = (async (): Promise<ExternalLookup | null> => {
    // Icecat + UPC + OpenFacts in parallel — first draft wins.
    const [icecat, upc, productsFacts, foodFacts, beautyFacts] = await Promise.all([
      firstDraft(codes, async (code) => {
        let networkError = true;
        for (const url of icecatUrls(code)) {
          const payload = await fetchJson(url, 3500);
          if (payload == null) continue;
          networkError = false;
          const draft = mapIcecatProduct(payload, barcode);
          if (draft) return { draft, networkError: false };
          if (isIcecatMiss(payload)) break;
        }
        return { draft: null, networkError };
      }),
      firstDraft(codes, async (code) => {
        const payload = await fetchUpcitemdb(code);
        const fromApi = payload ? mapUpcitemdbProduct(payload, barcode) : null;
        if (fromApi) return { draft: fromApi, networkError: false };
        const fromHtml = await scrapeUpcitemdbPage(code, barcode);
        if (fromHtml) return { draft: fromHtml, networkError: false };
        return { draft: null, networkError: payload == null };
      }),
      lookupOpenFacts("world.openproductsfacts.org", "openproductsfacts", codes, barcode),
      lookupOpenFacts("world.openfoodfacts.org", "openfoodfacts", codes, barcode),
      lookupOpenFacts("world.openbeautyfacts.org", "openbeautyfacts", codes, barcode),
    ]);

    const hit =
      [icecat.draft, upc.draft, productsFacts.draft, foodFacts.draft, beautyFacts.draft].find(
        isSolidCatalogHit,
      ) ?? null;
    if (hit) {
      const enriched = await ensureMinProductImages(hit, barcode, 3);
      return { draft: enriched, offline: false };
    }
    return null;
  })();

  const webPromise = lookupWebFallbacks(barcode);

  // Prefer a fast catalog hit; don't block web/Gemini while waiting.
  const earlyCatalog = await Promise.race([
    catalogPromise,
    new Promise<null>((resolve) => setTimeout(() => resolve(null), 4200)),
  ]);
  if (earlyCatalog?.draft && isSolidCatalogHit(earlyCatalog.draft)) {
    return earlyCatalog;
  }

  const [catalogFinal, web] = await Promise.all([
    catalogPromise,
    Promise.race([
      webPromise,
      new Promise<{ draft: null; networkError: boolean }>((resolve) =>
        setTimeout(() => resolve({ draft: null, networkError: true }), 18_000),
      ),
    ]),
  ]);

  if (catalogFinal?.draft && isSolidCatalogHit(catalogFinal.draft)) {
    return catalogFinal;
  }
  if (web.draft) return { draft: web.draft, offline: false };

  // Weak catalog stub (e.g. brand-only) is better than nothing.
  if (catalogFinal?.draft) return catalogFinal;

  return {
    draft: null,
    offline: web.networkError,
  };
}
