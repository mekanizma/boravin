import "server-only";

import { getStorageProvider } from "@/lib/storage";
import {
  isAllowedProductImageUrl,
  isSafePublicImageUrl,
  upgradeToFullSizeImageUrl,
} from "@/lib/barcode/parse";

const MAX_BYTES = 6 * 1024 * 1024;

/** Stable catalog CDNs — keep hotlink; survives ephemeral local disks on deploy. */
const STABLE_CATALOG_HOSTS = [
  "images.icecat.biz",
  "images.openproductsfacts.org",
  "images.openfoodfacts.org",
  "images.openbeautyfacts.org",
  "static.openfoodfacts.org",
  "static.openfoodfacts.net",
  "static.openbeautyfacts.org",
  "commons.wikimedia.org",
  "upload.wikimedia.org",
];

function isStableCatalogUrl(raw: string): boolean {
  try {
    const host = new URL(raw).hostname.toLowerCase();
    return STABLE_CATALOG_HOSTS.some(
      (h) => host === h || host.endsWith(`.${h}`),
    );
  } catch {
    return false;
  }
}

function sniffImage(bytes: Uint8Array): { ext: string; contentType: string } | null {
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return { ext: ".jpg", contentType: "image/jpeg" };
  }
  if (
    bytes.length >= 8 &&
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47
  ) {
    return { ext: ".png", contentType: "image/png" };
  }
  if (bytes.length >= 6 && bytes[0] === 0x47 && bytes[1] === 0x49 && bytes[2] === 0x46) {
    return { ext: ".gif", contentType: "image/gif" };
  }
  if (
    bytes.length >= 12 &&
    bytes[0] === 0x52 &&
    bytes[1] === 0x49 &&
    bytes[2] === 0x46 &&
    bytes[3] === 0x46 &&
    bytes[8] === 0x57 &&
    bytes[9] === 0x45 &&
    bytes[10] === 0x42 &&
    bytes[11] === 0x50
  ) {
    return { ext: ".webp", contentType: "image/webp" };
  }
  return null;
}

export async function storeRemoteProductImage(rawUrl: string): Promise<string | null> {
  // Catalog hosts or any SSRF-safe https (web search). Content is sniffed as a real image.
  if (!isAllowedProductImageUrl(rawUrl) && !isSafePublicImageUrl(rawUrl)) return null;
  const upgraded = upgradeToFullSizeImageUrl(rawUrl);
  // Icecat / Open*Facts / Wikimedia: keep CDN URL (full-size, durable across deploys).
  if (isAllowedProductImageUrl(upgraded) && isStableCatalogUrl(upgraded)) {
    return upgraded;
  }
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 12000);
  try {
    const response = await fetch(upgraded, {
      signal: controller.signal,
      redirect: "follow",
      headers: { Accept: "image/avif,image/webp,image/*,*/*" },
    });
    if (!response.ok) return null;
    if (!isSafePublicImageUrl(response.url)) return null;
    const bytes = new Uint8Array(await response.arrayBuffer());
    if (!bytes.byteLength || bytes.byteLength > MAX_BYTES) return null;
    const sniffed = sniffImage(bytes);
    if (!sniffed) return null;
    const stored = await getStorageProvider().upload({
      filename: `barcode${sniffed.ext}`,
      contentType: sniffed.contentType,
      body: Buffer.from(bytes),
      folder: "products",
    });
    return stored.url;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

export async function storeUploadedImage(
  file: File,
  folder = "general",
): Promise<string | null> {
  if (!file.size || file.size > MAX_BYTES) return null;
  if (file.type === "image/svg+xml") return null;
  const bytes = new Uint8Array(await file.arrayBuffer());
  const sniffed = sniffImage(bytes);
  if (!sniffed) return null;
  const stored = await getStorageProvider().upload({
    filename: `upload${sniffed.ext}`,
    contentType: sniffed.contentType,
    body: Buffer.from(bytes),
    folder,
  });
  return stored.url;
}

export async function storeUploadedProductImage(file: File): Promise<string | null> {
  return storeUploadedImage(file, "products");
}
