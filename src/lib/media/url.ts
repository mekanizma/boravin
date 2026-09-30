const FALLBACK =
  "https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=800&h=1000&q=80";

/** True for app-managed uploads (local disk or Supabase Storage public URLs). */
export function isStoredMediaUrl(url: string | null | undefined): boolean {
  if (!url) return false;
  const trimmed = url.trim();
  if (!trimmed) return false;
  if (trimmed.startsWith("/uploads/") || trimmed.startsWith("uploads/")) {
    return true;
  }
  return /\/storage\/v1\/object\/public\//i.test(trimmed);
}

/** Normalize product/media URLs for storefront. Local `/uploads/` paths are served as-is. */
export function publicImageUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  const trimmed = url.trim();
  if (!trimmed) return null;
  if (trimmed.startsWith("uploads/")) return `/${trimmed}`;
  return trimmed;
}

export function publicImageUrlOrFallback(url: string | null | undefined): string {
  return publicImageUrl(url) ?? FALLBACK;
}
