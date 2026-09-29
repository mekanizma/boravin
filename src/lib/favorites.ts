export type FavoriteItem = {
  id: string;
  name: string;
  slug: string;
  price: number;
  imageUrl?: string | null;
};

const KEY = "bv-favorites";

export function readFavorites(): FavoriteItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(KEY);
    const parsed = raw ? (JSON.parse(raw) as FavoriteItem[]) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function isFavorite(productId: string) {
  return readFavorites().some((item) => item.id === productId);
}

export function toggleFavorite(item: FavoriteItem) {
  const current = readFavorites();
  const exists = current.some((entry) => entry.id === item.id);
  const next = exists
    ? current.filter((entry) => entry.id !== item.id)
    : [item, ...current];
  window.localStorage.setItem(KEY, JSON.stringify(next));
  return !exists;
}
