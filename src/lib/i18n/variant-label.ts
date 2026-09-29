const VARIANT_LABELS: Record<string, { tr: string; en: string }> = {
  siyah: { tr: "Siyah", en: "Black" },
  beyaz: { tr: "Beyaz", en: "White" },
  gri: { tr: "Gri", en: "Grey" },
  "gümüş": { tr: "Gümüş", en: "Silver" },
  gumus: { tr: "Gümüş", en: "Silver" },
  mavi: { tr: "Mavi", en: "Blue" },
  kırmızı: { tr: "Kırmızı", en: "Red" },
  kirmizi: { tr: "Kırmızı", en: "Red" },
  yeşil: { tr: "Yeşil", en: "Green" },
  yesil: { tr: "Yeşil", en: "Green" },
  sarı: { tr: "Sarı", en: "Yellow" },
  sari: { tr: "Sarı", en: "Yellow" },
  turuncu: { tr: "Turuncu", en: "Orange" },
  pembe: { tr: "Pembe", en: "Pink" },
  mor: { tr: "Mor", en: "Purple" },
  altın: { tr: "Altın", en: "Gold" },
  altin: { tr: "Altın", en: "Gold" },
  titanyum: { tr: "Titanyum", en: "Titanium" },
  natural: { tr: "Natural", en: "Natural" },
  desert: { tr: "Desert", en: "Desert" },
  midnight: { tr: "Midnight", en: "Midnight" },
  starlight: { tr: "Starlight", en: "Starlight" },
};

function normalizeVariantKey(name: string) {
  return name
    .trim()
    .toLocaleLowerCase("tr-TR")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/ğ/g, "g")
    .replace(/ü/g, "u")
    .replace(/ş/g, "s")
    .replace(/ı/g, "i")
    .replace(/ö/g, "o")
    .replace(/ç/g, "c");
}

export function translateVariantLabel(
  name: string,
  locale: string,
): string {
  const key = normalizeVariantKey(name);
  const hit = VARIANT_LABELS[key] ?? VARIANT_LABELS[name.trim().toLocaleLowerCase("tr-TR")];
  if (!hit) return name;
  return locale === "en" ? hit.en : hit.tr;
}
