import type { BarcodeSource, CatalogOption, ProductDraft } from "@/lib/barcode/types";
import { slugify } from "@/lib/utils";

const IMAGE_HOSTS = new Set([
  "images.icecat.biz",
  "images.openproductsfacts.org",
  "images.openfoodfacts.org",
  "images.openbeautyfacts.org",
  "static.openfoodfacts.org",
  "static.openfoodfacts.net",
  "static.openbeautyfacts.org",
  "commons.wikimedia.org",
  "upload.wikimedia.org",
]);

/** Extra CDNs commonly returned by general barcode APIs (electronics retail). */
const EXTRA_IMAGE_HOST_SUFFIXES = [
  "newegg.com",
  "neweggimages.com",
  "walmartimages.com",
  "media-amazon.com",
  "ssl-images-amazon.com",
  "target.scene7.com",
  "bbystatic.com",
  "bestbuy.com",
  "lh3.googleusercontent.com",
  "googleusercontent.com",
  "ggpht.com",
  "upcitemdb.com",
  "scene7.com",
  "akamaihd.net",
  "cloudinary.com",
  "shopify.com",
  "cdn.shopify.com",
  "m.media-amazon.com",
  "images-na.ssl-images-amazon.com",
  "i5.walmartimages.com",
  "cdn11.bigcommerce.com",
  "scene7.com",
];

/** Web-search fallbacks may cite any public CDN; still block SSRF targets. */
const LOOSE_IMAGE_SOURCES = new Set<BarcodeSource>([
  "google",
  "duckduckgo",
  "wikidata",
]);

const SOURCE_LABEL: Record<BarcodeSource, string> = {
  icecat: "Open Icecat",
  upcitemdb: "UPCitemdb",
  openproductsfacts: "Open Products Facts",
  openfoodfacts: "Open Food Facts",
  openbeautyfacts: "Open Beauty Facts",
  wikidata: "Wikidata",
  google: "Web arama",
  duckduckgo: "Web araması",
};

export function normalizeBarcode(raw: string): string | null {
  const digits = raw.replace(/\D/g, "");
  if (digits.length !== 8 && digits.length !== 12 && digits.length !== 13 && digits.length !== 14) {
    return null;
  }
  return digits;
}

/** UPC-A / EAN-13 / GTIN-14 often mirror each other in public catalogs. */
export function barcodeCandidates(code: string): string[] {
  const out = [code];
  if (code.length === 12) {
    out.push(`0${code}`);
    out.push(`00${code}`);
  }
  if (code.length === 13) {
    out.push(`0${code}`);
    if (code.startsWith("0")) out.push(code.slice(1));
  }
  if (code.length === 14) {
    if (code.startsWith("0")) out.push(code.slice(1));
    if (code.startsWith("00")) out.push(code.slice(2));
  }
  return [...new Set(out)];
}

function hostAllowed(hostname: string): boolean {
  const host = hostname.toLowerCase();
  if (IMAGE_HOSTS.has(host)) return true;
  return EXTRA_IMAGE_HOST_SUFFIXES.some(
    (suffix) => host === suffix || host.endsWith(`.${suffix}`),
  );
}

function isBlockedImageHost(host: string): boolean {
  if (
    host === "localhost" ||
    host.endsWith(".localhost") ||
    host.endsWith(".local") ||
    host.endsWith(".internal") ||
    host.endsWith(".lan") ||
    host === "0.0.0.0" ||
    host === "::1"
  ) {
    return true;
  }
  // Block literal IPv4 private / loopback / link-local ranges.
  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(host)) {
    const parts = host.split(".").map(Number);
    const [a, b] = parts;
    if (
      a === 10 ||
      a === 127 ||
      a === 0 ||
      (a === 169 && b === 254) ||
      (a === 172 && b >= 16 && b <= 31) ||
      (a === 192 && b === 168)
    ) {
      return true;
    }
  }
  return false;
}

/** SSRF-safe https URL (used for web-search image fallbacks). */
export function isSafePublicImageUrl(raw: string): boolean {
  try {
    const url = new URL(raw);
    if (url.protocol !== "https:") return false;
    if (url.username || url.password) return false;
    return !isBlockedImageHost(url.hostname.toLowerCase());
  } catch {
    return false;
  }
}

export function isAllowedProductImageUrl(raw: string): boolean {
  try {
    const url = new URL(raw);
    if (!isSafePublicImageUrl(raw)) return false;
    return hostAllowed(url.hostname.toLowerCase());
  } catch {
    return false;
  }
}

/** Promote common CDN/thumbnail URLs to the largest available asset. */
export function upgradeToFullSizeImageUrl(raw: string): string {
  let url = raw.trim();
  if (!url) return url;

  try {
    const parsed = new URL(url);
    const nested =
      parsed.searchParams.get("u") ||
      parsed.searchParams.get("url") ||
      parsed.searchParams.get("imgurl") ||
      parsed.searchParams.get("imgrefurl") ||
      "";
    if (/^https?:\/\//i.test(nested)) url = nested;
  } catch {
    // keep original
  }

  url = url.replace(/\._[A-Z]{1,3}\d{2,4}_[^.]*\./gi, ".");
  url = url.replace(/\._AC_[^./]+_\./gi, ".");
  url = url.replace(/\._SL\d+_\./gi, ".");
  url = url.replace(/=s\d+(-[a-z]+)?$/i, "=s0");
  url = url.replace(/=w\d+-h\d+[^&]*/i, "=s0");
  url = url.replace(/_\d{2,4}x\d{2,4}(?=\.[a-z]{3,4}(?:\?|$))/i, "");
  url = url.replace(/\/cache\/\d+\//i, "/");
  url = url.replace(/\.(100|200|400)\.(jpe?g|png|webp)(\?|$)/i, ".$2$3");
  url = url.replace(/\/thumbs?\//i, "/");
  url = url.replace(/\/thumbnail\//i, "/");
  return url;
}

export function stripHtml(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/\r/g, "")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export function suggestSku(partCode: string | null | undefined, barcode: string): string {
  const cleaned = (partCode ?? "")
    .toUpperCase()
    .replace(/[^A-Z0-9-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 64);
  if (cleaned.length >= 2) return cleaned;
  return barcode;
}

export function sanitizeSpecs(
  input: Record<string, string>,
  limit = 24,
): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [key, value] of Object.entries(input)) {
    const name = key.replace(/\s+/g, " ").trim().slice(0, 80);
    const text = value.replace(/\s+/g, " ").trim().slice(0, 240);
    if (!name || !text) continue;
    if (out[name]) continue;
    out[name] = text;
    if (Object.keys(out).length >= limit) break;
  }
  return out;
}

function missingFields(draft: Omit<ProductDraft, "missing">): string[] {
  const missing: string[] = [];
  if (!draft.name) missing.push("Ürün adı");
  if (!draft.brand) missing.push("Marka");
  if (!draft.imageUrls.length) missing.push("Ürün görseli");
  if (!draft.shortDescription && !draft.description) missing.push("Açıklama");
  return missing;
}

function uniqueUrls(urls: string[], source: BarcodeSource): string[] {
  const allow =
    LOOSE_IMAGE_SOURCES.has(source) ? isSafePublicImageUrl : isAllowedProductImageUrl;
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of urls) {
    const url = upgradeToFullSizeImageUrl(raw);
    if (!allow(url) || seen.has(url)) continue;
    seen.add(url);
    out.push(url);
    if (out.length >= 8) break;
  }
  return out;
}

function finalize(
  source: BarcodeSource,
  barcode: string,
  input: {
    name?: string;
    brand?: string;
    categoryHint?: string;
    shortDescription?: string;
    description?: string;
    skuPart?: string;
    imageUrls?: string[];
    specs?: Record<string, string>;
  },
): ProductDraft | null {
  const description = stripHtml(input.description ?? "").slice(0, 8000);
  let shortDescription = (input.shortDescription ?? "").replace(/\s+/g, " ").trim().slice(0, 400);
  if (!shortDescription && description) {
    shortDescription = description.replace(/\s+/g, " ").slice(0, 180);
  }
  const fullDescription = description || shortDescription;
  const draft: Omit<ProductDraft, "missing"> = {
    source,
    sourceLabel: SOURCE_LABEL[source],
    name: (input.name ?? "").replace(/\s+/g, " ").trim().slice(0, 255),
    brand: (input.brand ?? "").replace(/\s+/g, " ").trim().slice(0, 160),
    categoryHint: (input.categoryHint ?? "").replace(/\s+/g, " ").trim().slice(0, 160),
    shortDescription,
    description: fullDescription,
    sku: suggestSku(input.skuPart, barcode),
    imageUrls: uniqueUrls(input.imageUrls ?? [], source),
    specs: sanitizeSpecs(input.specs ?? {}),
  };
  const useful =
    draft.name ||
    draft.brand ||
    draft.description ||
    draft.imageUrls.length > 0 ||
    Object.keys(draft.specs).length > 0;
  if (!useful) return null;
  return { ...draft, missing: missingFields(draft) };
}

type IcecatFeature = {
  PresentationValue?: string;
  Feature?: { Name?: { Value?: string } };
};

type IcecatPayload = {
  msg?: string;
  data?: {
    GeneralInfo?: {
      Title?: string;
      Brand?: string;
      ProductName?: string;
      BrandPartCode?: string;
      Category?: { Name?: { Value?: string } };
      SummaryDescription?: {
        ShortSummaryDescription?: string;
        LongSummaryDescription?: string;
      };
      Description?: { LongDesc?: string };
    };
    Image?: { HighPic?: string; Pic500x500?: string };
    Gallery?: Array<{ Pic?: string; Pic500x500?: string }>;
    FeaturesGroups?: Array<{
      Features?: IcecatFeature[];
    }>;
  };
};

export function mapIcecatProduct(payload: unknown, barcode: string): ProductDraft | null {
  const data = payload as IcecatPayload;
  if (data?.msg !== "OK" || !data.data?.GeneralInfo) return null;
  const info = data.data.GeneralInfo;
  const specs: Record<string, string> = {};
  for (const group of data.data.FeaturesGroups ?? []) {
    for (const feature of group.Features ?? []) {
      const key = feature.Feature?.Name?.Value ?? "";
      const value = feature.PresentationValue ?? "";
      if (!key || !value) continue;
      if (!specs[key]) specs[key] = value;
    }
  }
  const images = [
    data.data.Image?.HighPic,
    ...(data.data.Gallery ?? []).map((item) => item.Pic),
    data.data.Image?.Pic500x500,
    ...(data.data.Gallery ?? []).map((item) => item.Pic500x500),
  ].filter((url): url is string => Boolean(url));

  return finalize("icecat", barcode, {
    name: info.Title || info.ProductName,
    brand: info.Brand,
    categoryHint: info.Category?.Name?.Value,
    shortDescription: info.SummaryDescription?.ShortSummaryDescription,
    description:
      info.Description?.LongDesc ||
      info.SummaryDescription?.LongSummaryDescription ||
      info.SummaryDescription?.ShortSummaryDescription,
    skuPart: info.BrandPartCode || info.ProductName,
    imageUrls: images,
    specs,
  });
}

type UpcitemdbItem = {
  title?: string;
  brand?: string;
  model?: string;
  category?: string;
  description?: string;
  color?: string;
  size?: string;
  images?: string[];
};

export function mapUpcitemdbProduct(payload: unknown, barcode: string): ProductDraft | null {
  const body = payload as { code?: string; items?: UpcitemdbItem[] };
  if (body?.code !== "OK" || !Array.isArray(body.items) || body.items.length === 0) {
    return null;
  }
  const item = body.items[0];
  if (!item) return null;
  const specs: Record<string, string> = {};
  if (item.model) specs["Model"] = item.model;
  if (item.color) specs["Renk"] = item.color;
  if (item.size) specs["Boyut"] = item.size;
  const categoryHint = (item.category ?? "")
    .split(">")
    .map((part) => part.trim())
    .filter(Boolean)
    .slice(-1)[0];

  return finalize("upcitemdb", barcode, {
    name: item.title,
    brand: item.brand,
    categoryHint,
    description: item.description,
    skuPart: item.model || item.title,
    imageUrls: item.images ?? [],
    specs,
  });
}

type OpenFactsProduct = {
  product_name?: string;
  product_name_tr?: string;
  product_name_en?: string;
  generic_name?: string;
  generic_name_tr?: string;
  brands?: string;
  categories?: string;
  quantity?: string;
  ingredients_text?: string;
  ingredients_text_tr?: string;
  image_front_url?: string;
  image_url?: string;
  selected_images?: Record<string, { display?: Record<string, string> }>;
};

export function mapOpenFactsProduct(
  payload: unknown,
  barcode: string,
  source: "openproductsfacts" | "openfoodfacts" | "openbeautyfacts",
): ProductDraft | null {
  const body = payload as { status?: number; product?: OpenFactsProduct };
  if (body?.status !== 1 || !body.product) return null;
  const product = body.product;
  const name =
    product.product_name_tr ||
    product.product_name ||
    product.product_name_en ||
    product.generic_name_tr ||
    product.generic_name ||
    "";
  const displayImages = Object.values(product.selected_images ?? {}).flatMap(
    (slot) => {
      const display = slot.display ?? {};
      // Prefer full / largest keys when present.
      const preferredKeys = ["full", "display", "400", "200", "100"];
      const ordered = [
        ...preferredKeys.map((key) => display[key]).filter(Boolean),
        ...Object.values(display),
      ];
      return ordered.filter((url): url is string => Boolean(url));
    },
  );
  const images = [
    product.image_front_url,
    product.image_url,
    ...displayImages,
  ].filter((url): url is string => Boolean(url));
  const details = [
    product.generic_name_tr || product.generic_name,
    product.quantity ? `Miktar: ${product.quantity}` : "",
    product.ingredients_text_tr || product.ingredients_text,
  ]
    .filter(Boolean)
    .join("\n\n");
  const specs: Record<string, string> = {};
  if (product.quantity) specs["Miktar"] = product.quantity;
  const categoryHint = (product.categories ?? "")
    .split(",")
    .map((part) => part.trim())
    .filter((part) => part && !part.startsWith("en:"))
    .slice(0, 1)
    .join("");

  return finalize(source, barcode, {
    name,
    brand: (product.brands ?? "").split(",")[0],
    categoryHint,
    description: details,
    imageUrls: images,
    specs,
  });
}

export type WebSearchProductInput = {
  name?: string;
  brand?: string;
  category?: string;
  shortDescription?: string;
  description?: string;
  model?: string;
  imageUrls?: string[];
};

export function mapWebSearchProduct(
  input: WebSearchProductInput,
  barcode: string,
  source: "google" | "duckduckgo" | "wikidata",
): ProductDraft | null {
  return finalize(source, barcode, {
    name: input.name,
    brand: input.brand,
    categoryHint: input.category,
    shortDescription: input.shortDescription,
    description: input.description,
    skuPart: input.model || input.name,
    imageUrls: input.imageUrls ?? [],
  });
}

const CATEGORY_RULES: Array<{ re: RegExp; slugIncludes: string }> = [
  { re: /macbook/, slugIncludes: "apple-macbook" },
  { re: /gaming[- ]?(laptop|notebook)|oyuncu[- ]?(laptop|notebook)/, slugIncludes: "gaming-laptoplar" },
  { re: /laptop|notebook|dizustu/, slugIncludes: "notebook" },
  { re: /all[- ]?in[- ]?one/, slugIncludes: "all-in-one" },
  { re: /mini[- ]?pc/, slugIncludes: "mini-pc" },
  { re: /tablet/, slugIncludes: "tablet" },
  { re: /gaming[- ]?monitor|oyuncu[- ]?monitor/, slugIncludes: "gaming-monitor" },
  { re: /monitor|duz ekran|display/, slugIncludes: "monitor" },
  { re: /\bm2\b|nvme/, slugIncludes: "m2-disk" },
  { re: /ssd|solid state/, slugIncludes: "ssd" },
  { re: /harici disk|external disk|external drive/, slugIncludes: "harici-disk" },
  { re: /hard disk|sabit disk|\bhdd\b/, slugIncludes: "sabit-disk" },
  { re: /anakart|motherboard/, slugIncludes: "anakart" },
  { re: /bellek|\bram\b|ddr[345]/, slugIncludes: "bellek" },
  { re: /ekran kart|graphics card|video card/, slugIncludes: "ekran-kart" },
  { re: /islemci|processor|\bcpu\b/, slugIncludes: "islemci" },
  { re: /power supply|guc kaynagi|\bpsu\b/, slugIncludes: "power-supply" },
  { re: /sogutma|cooler|cooling/, slugIncludes: "sogutma" },
  { re: /\bkasa\b|pc case|chassis/, slugIncludes: "kasa" },
  { re: /klavye|keyboard/, slugIncludes: "klavye" },
  { re: /mousepad|mouse pad/, slugIncludes: "mousepad" },
  { re: /mouse|\bfare\b/, slugIncludes: "mouse" },
  { re: /kulaklik|headset|headphone/, slugIncludes: "kulaklik" },
  { re: /hoparlor|speaker/, slugIncludes: "hoparlor" },
  { re: /webcam|web cam/, slugIncludes: "web-cam" },
  { re: /router|access point/, slugIncludes: "router" },
  { re: /\bswitch\b/, slugIncludes: "switch" },
  { re: /toner/, slugIncludes: "toner" },
  { re: /kartus|cartridge/, slugIncludes: "kartus" },
  { re: /yazici|printer/, slugIncludes: "yazici" },
  { re: /iphone|smartphone|cep telefon/, slugIncludes: "telefon" },
  { re: /televizyon|television/, slugIncludes: "televizyon" },
  { re: /projeksiyon|projector/, slugIncludes: "projeksiyon" },
  { re: /akilli saat|smartwatch/, slugIncludes: "akilli-saat" },
  { re: /oyun konsol|gamepad/, slugIncludes: "oyun-konsol" },
];

function pickCategory(categories: CatalogOption[], slugIncludes: string): string | null {
  const hits = categories.filter((category) => {
    const slug = category.slug;
    if (slugIncludes === "mouse") {
      return slug.includes("mouse") && !slug.includes("mousepad");
    }
    return slug.includes(slugIncludes) || slugify(category.name).includes(slugIncludes);
  });
  if (!hits.length) return null;
  hits.sort((a, b) => a.slug.length - b.slug.length);
  return hits[0]?.id ?? null;
}

function matchText(categories: CatalogOption[], text: string): string | null {
  const hay = slugify(text);
  if (!hay) return null;
  const direct = categories.find(
    (category) => slugify(category.name) === hay || category.slug === hay,
  );
  if (direct) return direct.id;
  for (const rule of CATEGORY_RULES) {
    if (!rule.re.test(hay)) continue;
    const id = pickCategory(categories, rule.slugIncludes);
    if (id) return id;
  }
  return null;
}

export function matchCategoryId(
  categories: CatalogOption[],
  hint: string,
  productName: string,
): string | null {
  return matchText(categories, hint) ?? matchText(categories, productName);
}

export function matchBrandId(brands: CatalogOption[], brandName: string): string | null {
  const target = slugify(brandName);
  if (!target) return null;
  return brands.find((brand) => slugify(brand.name) === target || brand.slug === target)?.id ?? null;
}
