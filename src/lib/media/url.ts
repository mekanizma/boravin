const FALLBACK =
  "https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=800&h=1000&q=80";

/** Drop local upload paths that do not exist on Render ephemeral/missing disks. */
export function publicImageUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  const trimmed = url.trim();
  if (!trimmed) return null;
  if (trimmed.startsWith("/uploads/") || trimmed.startsWith("uploads/")) {
    return FALLBACK;
  }
  return trimmed;
}

export function publicImageUrlOrFallback(url: string | null | undefined): string {
  return publicImageUrl(url) ?? FALLBACK;
}
