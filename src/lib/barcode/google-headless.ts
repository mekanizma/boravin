import "server-only";

import { accessSync, constants } from "node:fs";
import { join } from "node:path";
import type { Page } from "puppeteer-core";
import { isSafePublicImageUrl } from "@/lib/barcode/parse";
import {
  decodeSwisscowsJwtPayload,
  swisscowsSignRequest,
} from "@/lib/barcode/swisscows-sign";

export type GoogleOrganicHit = {
  title: string;
  url: string;
  snippet: string;
  imageUrl?: string;
};

const JUNK_HOST =
  /(google\.|bing\.|duckduckgo\.|brave\.com|swisscows\.|ecosia\.|youtube\.|facebook\.|instagram\.|twitter\.|x\.com|tiktok\.|barcodelookup\.|go-upc\.|upcitemdb\.|ean-search\.|scanbot\.|scandit\.|17track\.|barcode.?lookup|hackerone\.|allergeninside\.|jonesfarmsupply\.|nutritionvalue\.|nahdionline\.)/i;

const SEARCH_BUDGET_MS = 9_000;

function chromeCandidates(): string[] {
  const envPath = process.env.CHROME_PATH?.trim() || process.env.GOOGLE_CHROME_PATH?.trim();
  const local = process.env.LOCALAPPDATA || "";
  const pf = process.env.PROGRAMFILES || "C:\\Program Files";
  const pf86 = process.env["PROGRAMFILES(X86)"] || "C:\\Program Files (x86)";
  return [
    envPath,
    join(pf, "Google", "Chrome", "Application", "chrome.exe"),
    join(pf86, "Google", "Chrome", "Application", "chrome.exe"),
    join(local, "Google", "Chrome", "Application", "chrome.exe"),
    join(pf, "Microsoft", "Edge", "Application", "msedge.exe"),
    join(pf86, "Microsoft", "Edge", "Application", "msedge.exe"),
    "/usr/bin/google-chrome",
    "/usr/bin/google-chrome-stable",
    "/usr/bin/chromium",
    "/usr/bin/chromium-browser",
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  ].filter((path): path is string => Boolean(path));
}

function resolveChrome(): string | null {
  for (const path of chromeCandidates()) {
    try {
      accessSync(path, constants.F_OK);
      return path;
    } catch {
      // keep looking
    }
  }
  return null;
}

function decodeHtml(text: string): string {
  return text
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&#x27;/g, "'")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/\s+/g, " ")
    .trim();
}

function stripTags(html: string): string {
  return decodeHtml(html.replace(/<[^>]+>/g, " "));
}

function cleanTitle(title: string): string {
  let text = title
    .replace(/\s*[|–-]\s*(?:Ubuy|Amazon|Trendyol|Hepsiburada|OnuAl|Brave|Prices|Features and Reviews).*$/i, "")
    .replace(/\s+Prices,?\s*Features(?:\s+and\s+Reviews)?.*$/i, "")
    .replace(/\s*\.\.\.\s*$/g, "")
    .replace(/\s+/g, " ")
    .trim();
  if (text === text.toLowerCase()) {
    text = text.replace(/\b[a-zçğıöşü]+/g, (word) => {
      if (/^(wi-?fi|ptz|ip\d+|led|x\d+)$/i.test(word)) return word.toUpperCase();
      return word.charAt(0).toLocaleUpperCase("tr-TR") + word.slice(1);
    });
  }
  return text
    .replace(/\b[İIıi]p(\d+)\b/gi, "IP$1")
    .replace(/\bWi-?Fi\b/gi, "Wi-Fi")
    .replace(/\bPtz\b/g, "PTZ")
    .slice(0, 180);
}

function isUsefulHit(hit: GoogleOrganicHit, barcode: string): boolean {
  if (!hit.title || hit.title.length < 8) return false;
  if (
    /^(hepsiburada|trendyol|n11|amazon|shoplet|report a security|cosmetics|pepsi|makeup|imperial nuts|allergy free)/i.test(
      hit.title,
    )
  ) {
    return false;
  }
  if (/makeupstore|allergeninside|jonesfarm|hackerone|nutritionvalue/i.test(hit.url)) return false;
  if (hit.url) {
    try {
      if (JUNK_HOST.test(new URL(hit.url).hostname)) return false;
    } catch {
      return false;
    }
  }
  const blob = `${hit.title} ${hit.snippet} ${hit.url}`;
  if (blob.includes(barcode)) return true;
  return /kamera|camera|upc|ean|gtin|wifi|wireless|akıllı|outdoor|güvenlik|security|ptz|ip65|xenon/i.test(
    blob,
  );
}

export function extractBrandFromSnippet(snippet: string, title: string): string {
  const producers =
    snippet.match(/Producers?\s*[,:]\s*([^;,\n]+)/i)?.[1]?.trim() ||
    snippet.match(/Marka\s*[,:]\s*([^;,\n]+)/i)?.[1]?.trim() ||
    snippet.match(/Brand\s*[,:]\s*([^;,\n]+)/i)?.[1]?.trim() ||
    "";
  if (producers) return producers.slice(0, 80);
  const xenon = title.match(/\b(Xenon(?:\s+Smart)?)\b/i)?.[1];
  if (xenon) return xenon.replace(/\b\w/g, (ch) => ch.toUpperCase());
  const words = title.split(/\s+/).filter(Boolean);
  if (words.length >= 2 && /^[A-Za-z]/.test(words[0] ?? "") && /^[A-Za-z]/.test(words[1] ?? "")) {
    return `${words[0]} ${words[1]}`
      .replace(/\b\w/g, (ch) => ch.toUpperCase())
      .slice(0, 80);
  }
  return (words[0] ?? "").slice(0, 80);
}

function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T | null> {
  return new Promise((resolve) => {
    const timer = setTimeout(() => {
      console.error(`[barcode-web] timeout ${label} after ${ms}ms`);
      resolve(null);
    }, ms);
    promise
      .then((value) => {
        clearTimeout(timer);
        resolve(value);
      })
      .catch((error) => {
        clearTimeout(timer);
        console.error(`[barcode-web] ${label}`, error instanceof Error ? error.message : error);
        resolve(null);
      });
  });
}

function rankHits(raw: GoogleOrganicHit[], barcode: string): GoogleOrganicHit[] {
  const out: Array<GoogleOrganicHit & { score: number }> = [];
  const seen = new Set<string>();
  for (const hit of raw) {
    let title = cleanTitle(hit.title.replace(/\s+/g, " ").trim());
    if (!title || title.length < 12) continue;
    const key = hit.url || title;
    if (seen.has(key)) continue;
    const snippet = hit.snippet.slice(0, 300);
    const blob = `${title} ${snippet} ${hit.url}`.toLowerCase();
    let score = 0;
    if (snippet.includes(barcode) || title.includes(barcode)) score += 6;
    if (/xenon/.test(blob)) score += 4;
    if (/camera|kamera|security|güvenlik|ptz|ip65/.test(blob)) score += 3;
    if (/\/product\//i.test(hit.url) || /\/products\//i.test(hit.url)) score += 2;
    if (/shop\.|xenonsmart|official|kozmetikara|trendyol|hepsiburada|amazon\./i.test(hit.url)) {
      score += 3;
    }
    if (/stock code|barkod|gtin|upc|ean/i.test(snippet)) score += 2;
    if (/makeup|cosmetic|allergen|perfume|nuts|nutrition/i.test(blob)) score -= 5;
    if (score < 3) continue;
    seen.add(key);
    out.push({ title, url: hit.url, snippet: stripTags(snippet), score });
  }
  return out
    .sort((a, b) => b.score - a.score)
    .slice(0, 6)
    .filter((hit) => isUsefulHit(hit, barcode))
    .map(({ score: _score, ...hit }) => hit);
}

async function collectSwisscowsLinks(page: Page, query: string): Promise<GoogleOrganicHit[]> {
  await page.goto(`https://swisscows.com/en/web?query=${encodeURIComponent(query)}`, {
    waitUntil: "domcontentloaded",
    timeout: 12000,
  });
  await page
    .waitForFunction(
      () => document.querySelectorAll(".web-results .item, .item .title").length > 0,
      { timeout: 8000 },
    )
    .catch(() => undefined);

  return page.evaluate(() =>
    Array.from(document.querySelectorAll(".web-results .item")).map((item) => {
      const anchor = item.querySelector(
        "a.mainlink, a[href^='http']",
      ) as HTMLAnchorElement | null;
      const title =
        item.querySelector(".title, h2, h3")?.textContent?.replace(/\s+/g, " ").trim() ||
        anchor?.textContent?.replace(/\s+/g, " ").trim() ||
        "";
      const snippet =
        item
          .querySelector(".description, .snippet, p")
          ?.textContent?.replace(/\s+/g, " ")
          .trim() || "";
      return {
        title,
        url: anchor?.href || "",
        snippet: snippet.slice(0, 400),
      };
    }),
  );
}

async function launchBarcodeBrowser() {
  const chrome = resolveChrome();
  if (!chrome) {
    console.error("[barcode-web] Chrome/Edge bulunamadı");
    return null;
  }
  const puppeteer = await import("puppeteer-core");
  const browser = await puppeteer.default.launch({
    executablePath: chrome,
    headless: true,
    args: [
      "--disable-blink-features=AutomationControlled",
      "--no-first-run",
      "--no-default-browser-check",
      "--disable-dev-shm-usage",
      "--disable-gpu",
      "--disable-extensions",
      "--window-size=1280,800",
      "--lang=en-US",
    ],
    defaultViewport: { width: 1280, height: 800 },
  });
  const page: Page = await browser.newPage();
  await page.evaluateOnNewDocument(() => {
    Object.defineProperty(navigator, "webdriver", { get: () => undefined });
  });
  await page.setUserAgent(
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
  );
  await page.setExtraHTTPHeaders({
    "Accept-Language": "en-US,en;q=0.9,tr;q=0.8",
  });
  return { browser, page };
}

async function searchSwisscowsPuppeteer(barcode: string): Promise<GoogleOrganicHit[]> {
  const launched = await launchBarcodeBrowser();
  if (!launched) return [];
  const { browser, page } = launched;
  try {
    const first = await collectSwisscowsLinks(page, barcode);
    let merged = [...first];
    const seed = rankHits(first, barcode)[0];
    if (seed) {
      const brand = extractBrandFromSnippet(seed.snippet, seed.title);
      const model = seed.title.match(/\bX\d{3,5}\b/i)?.[0] ?? "";
      const followUp = [brand, model, barcode].filter(Boolean).join(" ").trim();
      if (followUp && followUp !== barcode) {
        const second = await collectSwisscowsLinks(page, followUp);
        merged = [...merged, ...second];
      }
    }
    return rankHits(merged, barcode);
  } finally {
    await browser.close().catch(() => undefined);
  }
}

function unwrapImageProxy(raw: string): string {
  try {
    const url = new URL(raw);
    const nested =
      url.searchParams.get("u") ||
      url.searchParams.get("url") ||
      url.searchParams.get("imgurl") ||
      "";
    if (nested && /^https?:\/\//i.test(nested)) return nested;
  } catch {
    // ignore
  }
  return raw;
}

function isUsefulProductImage(url: string, titleHint = ""): boolean {
  if (!isSafePublicImageUrl(url)) return false;
  const lower = url.toLowerCase();
  if (/\.svg(\?|$)/i.test(lower)) return false;
  if (/logo|icon|sprite|avatar|pixel|tracking|1x1|favicon|react-assets|app-buttons/i.test(lower)) {
    return false;
  }
  if (/facebook|twitter|instagram|payment|stripe|app-store|google-play/i.test(lower)) return false;
  try {
    const host = new URL(url).hostname.toLowerCase();
    if (
      /(^|\.)duckduckgo\.com$|(^|\.)swisscows\.com$|(^|\.)brave\.com$|(^|\.)bing\.com$|(^|\.)google\./i.test(
        host,
      )
    ) {
      // Allow CDN/proxy image hosts used by search engines, reject site chrome.
      if (!/external-content\.duckduckgo\.com|mm\.bing\.net|cdn\.swisscows|gstatic|googleusercontent/i.test(host)) {
        return false;
      }
    }
  } catch {
    return false;
  }
  void titleHint;
  return true;
}

/** DuckDuckGo image results for a product title (barcode-only image search is often empty). */
async function searchDuckDuckGoImages(query: string): Promise<string[]> {
  const q = query.replace(/\s+/g, " ").trim().slice(0, 120);
  if (q.length < 8) return [];
  const launched = await launchBarcodeBrowser();
  if (!launched) return [];
  const { browser, page } = launched;
  try {
    await page.goto(
      `https://duckduckgo.com/?q=${encodeURIComponent(q)}&iax=images&ia=images`,
      { waitUntil: "domcontentloaded", timeout: 12000 },
    );
    await page
      .waitForFunction(
        () =>
          Array.from(document.querySelectorAll("img")).some(
            (img) => (img.naturalWidth || img.width || 0) >= 120,
          ),
        { timeout: 7000 },
      )
      .catch(() => undefined);

    const raw = await page.evaluate(() =>
      Array.from(document.querySelectorAll("img"))
        .map((img) => ({
          src: img.currentSrc || img.src || "",
          alt: (img.alt || "").replace(/\s+/g, " ").trim(),
          w: img.naturalWidth || img.width || 0,
        }))
        .filter((row) => row.src.startsWith("http") && row.w >= 120)
        .slice(0, 16),
    );

    const out: string[] = [];
    for (const row of raw) {
      const url = unwrapImageProxy(row.src);
      if (!isUsefulProductImage(url, query)) continue;
      // Prefer larger decoded images when available.
      if (row.w > 0 && row.w < 180) continue;
      out.push(url);
      if (out.length >= 6) break;
    }
    return [...new Set(out)];
  } finally {
    await browser.close().catch(() => undefined);
  }
}

/** Brave HTML fetch — often CAPTCHA'd; kept as fast opportunistic path. */
async function searchBraveFetch(barcode: string): Promise<GoogleOrganicHit[]> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 5000);
  try {
    const res = await fetch(
      `https://search.brave.com/search?q=${encodeURIComponent(barcode)}`,
      {
        signal: controller.signal,
        headers: {
          Accept: "text/html,application/xhtml+xml",
          "Accept-Language": "tr-TR,tr;q=0.9,en;q=0.8",
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
        },
        redirect: "follow",
        cache: "no-store",
      },
    );
    if (!res.ok) return [];
    const html = await res.text();
    if (/captcha|verify|bot/i.test(html) || html.length < 5000) return [];
    if (!/Xenon|kamera|camera|product|stock/i.test(html)) return [];
    const links: GoogleOrganicHit[] = [];
    const re = /<a[^>]+href="(https?:\/\/[^"]+)"[^>]*>([\s\S]*?)<\/a>/gi;
    let match: RegExpExecArray | null;
    while ((match = re.exec(html)) && links.length < 40) {
      const url = decodeHtml(match[1] ?? "");
      const title = stripTags(match[2] ?? "");
      const snippet = stripTags(html.slice(Math.max(0, match.index - 80), match.index + 500));
      links.push({ title, url, snippet });
    }
    return rankHits(links, barcode);
  } catch {
    return [];
  } finally {
    clearTimeout(timer);
  }
}

export function parseGoogleSearchHtml(html: string, barcode: string): GoogleOrganicHit[] {
  const hits: GoogleOrganicHit[] = [];
  const seen = new Set<string>();
  const modern = /<h3[^>]*class="[^"]*LC20lb[^"]*"[^>]*>([\s\S]*?)<\/h3>/gi;
  let match: RegExpExecArray | null;
  while ((match = modern.exec(html)) && hits.length < 8) {
    const title = cleanTitle(stripTags(match[1] ?? ""));
    if (!title || seen.has(title)) continue;
    seen.add(title);
    hits.push({
      title,
      url: "",
      snippet: stripTags(html.slice(match.index, match.index + 800)).slice(0, 260),
    });
  }
  return hits.filter((hit) => isUsefulHit(hit, barcode));
}

/**
 * Signed Swisscows web search API — works on Render without Chrome.
 * Returns the same retail hits Google surfaces for many GTINs (Trendyol/Amazon style pages).
 */
export async function searchSwisscowsApi(barcode: string): Promise<GoogleOrganicHit[]> {
  const digits = barcode.replace(/\D/g, "");
  if (!digits) return [];

  const path = "/v5/web/search";
  const params = {
    query: digits,
    offset: 0,
    itemsCount: 10,
    locale: "tr-TR",
    freshness: "All",
    spellcheck: true,
  };
  const { nonce, signature } = swisscowsSignRequest(params, path);
  const qs = new URLSearchParams(
    Object.entries(params).map(([key, value]) => [key, String(value)]),
  ).toString();

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 8000);
  try {
    const response = await fetch(`https://api.swisscows.com${path}?${qs}`, {
      signal: controller.signal,
      headers: {
        Accept: "application/json, text/plain, */*",
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
        Referer: "https://swisscows.com/",
        "X-Referer": `https://swisscows.com/en/web?query=${digits}`,
        "X-Request-Nonce": nonce,
        "X-Request-Signature": signature,
        "Cache-Control": "no-cache",
      },
      cache: "no-store",
    });
    if (!response.ok) return [];
    const json = (await response.json().catch(() => null)) as { payload?: string } | null;
    if (!json?.payload) return [];
    const decoded = decodeSwisscowsJwtPayload(json.payload);
    const items = decoded?.items ?? [];
    const raw: GoogleOrganicHit[] = items
      .filter((item) => item.type === "WebPage" || Boolean(item.name))
      .map((item) => ({
        title: stripTags(item.name ?? ""),
        url: item.url ?? "",
        snippet: stripTags(item.description ?? "").slice(0, 400),
        imageUrl: item.thumbnail?.url,
      }));
    return rankHits(raw, digits);
  } catch (error) {
    console.error(
      "[barcode-web] swisscows-api",
      error instanceof Error ? error.message : error,
    );
    return [];
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Web search for retail GTINs. Prefers Swisscows signed API (no Chrome).
 * Brave/puppeteer remain optional fallbacks when headless is enabled.
 */
export async function searchGoogleHeadless(barcode: string): Promise<GoogleOrganicHit[]> {
  const digits = barcode.replace(/\D/g, "");
  if (!digits) return [];

  const apiHits = await withTimeout(searchSwisscowsApi(digits), 8500, "swisscows-api");
  if (apiHits?.length) return apiHits;

  if (process.env.BARCODE_GOOGLE_HEADLESS === "0") return [];

  const braveHits = await withTimeout(searchBraveFetch(digits), 5500, "brave-fetch");
  if (braveHits?.length) return braveHits;

  const swissHits = await withTimeout(
    searchSwisscowsPuppeteer(digits),
    SEARCH_BUDGET_MS,
    "swisscows-puppeteer",
  );
  return swissHits ?? [];
}

function pickOgImage(html: string, pageUrl: string): string | null {
  const og =
    html.match(
      /<meta[^>]+(?:property|name)=["'](?:og:image|og:image:url|twitter:image|twitter:image:src)["'][^>]+content=["']([^"']+)["']/i,
    )?.[1] ||
    html.match(
      /<meta[^>]+content=["']([^"']+)["'][^>]+(?:property|name)=["'](?:og:image|og:image:url|twitter:image)["']/i,
    )?.[1];
  if (!og) return null;
  try {
    const absolute = new URL(og, pageUrl).toString();
    return isUsefulProductImage(absolute) ? absolute : null;
  } catch {
    return null;
  }
}

async function fetchOgImage(pageUrl: string, timeoutMs = 7000): Promise<string | null> {
  if (!/^https:/i.test(pageUrl)) return null;
  if ((pageUrl.match(/\//g) || []).length <= 3) return null;
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    const response = await fetch(pageUrl, {
      signal: controller.signal,
      headers: {
        Accept: "text/html,application/xhtml+xml",
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
        "Accept-Language": "tr-TR,tr;q=0.9,en;q=0.8",
      },
      redirect: "follow",
      cache: "no-store",
    });
    clearTimeout(timer);
    if (!response.ok) return null;
    const html = await response.text();
    // Prefer pages that actually mention the product context when possible.
    return pickOgImage(html, pageUrl);
  } catch {
    return null;
  }
}

export async function enrichImagesFromGoogleHits(
  hits: GoogleOrganicHit[],
  titleHint = "",
): Promise<string[]> {
  const images: string[] = [];
  for (const hit of hits) {
    if (hit.imageUrl && isUsefulProductImage(hit.imageUrl, titleHint)) {
      images.push(hit.imageUrl);
    }
  }
  const pageUrls = [
    ...hits
      .filter((hit) => /\/products?\//i.test(hit.url) || /shop\.|xenon|trendyol|hepsiburada|kozmetikara|amazon/i.test(hit.url))
      .map((hit) => hit.url),
    ...hits.map((hit) => hit.url),
  ].filter((url, index, all) => url && all.indexOf(url) === index);

  for (const pageUrl of pageUrls.slice(0, 5)) {
    const og = await fetchOgImage(pageUrl);
    if (og) images.push(og);
    if (images.length >= 4) break;
  }

  if (images.length < 3 && titleHint) {
    const model = titleHint.match(/\bX\d{3,5}\b/i)?.[0] ?? "";
    const ddgQuery = [titleHint.slice(0, 80), model].filter(Boolean).join(" ");
    const ddg =
      (await withTimeout(searchDuckDuckGoImages(ddgQuery), 10000, "ddg-images")) ?? [];
    for (const url of ddg) {
      if (!images.includes(url)) images.push(url);
      if (images.length >= 6) break;
    }
  }

  return [...new Set(images)].slice(0, 6);
}
