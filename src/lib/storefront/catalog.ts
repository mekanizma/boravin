import { slugify } from "@/lib/utils";

type RawCategory = {
  name: string;
  slug?: string;
  children?: RawCategory[];
};

export type CatalogNode = {
  name: string;
  slug: string;
  href: string;
  children: CatalogNode[];
};

const RAW_CATEGORIES: RawCategory[] = [
  {
    name: "Bilgisayar",
    slug: "bilgisayar",
    children: [
      { name: "All in One Bilgisayarlar" },
      {
        name: "Notebook",
        children: [
          { name: "Gaming Laptoplar" },
          { name: "Laptoplar" },
          { name: "Apple Macbook" },
        ],
      },
      { name: "Tabletler" },
      { name: "Laptop & Pc Aksesuarlar" },
      { name: "Laptop Yedek Parça" },
      { name: "Masaüstü Oyuncu Bilgisayarları" },
      { name: "Microsoft Surface" },
      { name: "Mini PC" },
    ],
  },
  {
    name: "Bilgisayar Bileşenleri",
    slug: "bilesenler",
    children: [
      {
        name: "Monitörler",
        children: [{ name: "Gaming Monitörler" }, { name: "Led Monitörler" }],
      },
      {
        name: "Veri Depolama",
        children: [
          { name: "Ssd Diskler" },
          { name: "Sabit Diskler" },
          { name: "M2 Diskler" },
          { name: "Harici Diskler" },
        ],
      },
      {
        name: "Anakartlar",
        children: [{ name: "Amd Anakartlar" }, { name: "İntel Anakartlar" }],
      },
      { name: "Bellekler" },
      { name: "Ekran Kartları" },
      { name: "İşlemciler" },
      { name: "Kasalar" },
      { name: "Power Supply" },
      { name: "Soğutma Sistemleri" },
    ],
  },
  {
    name: "Çevre Birimleri",
    slug: "cevre-birimleri",
    children: [
      { name: "Router & Access Point" },
      { name: "Switch" },
      { name: "Klavye ve Klavye Setleri" },
      {
        name: "Mouse",
        children: [
          { name: "Kablolu mouse" },
          { name: "Kablosuz Mouse" },
          { name: "MousePad" },
        ],
      },
      {
        name: "Kulaklık",
        children: [{ name: "Kablosuz Kulaklıklar" }, { name: "Kablolu Kulaklıklar" }],
      },
      { name: "Menzil Genişletici & Powerline" },
      { name: "Kablosuz Adaptörler" },
      { name: "Hoparlör" },
      {
        name: "Güvenlik Ürünleri",
        children: [
          { name: "Adaptörler" },
          { name: "Ahd Kameralar" },
          { name: "İp Kameralar" },
          { name: "Ahd Kayıt Cihazları" },
        ],
      },
      { name: "Barkod Ürünleri" },
      {
        name: "Sarf Malzemeleri",
        children: [{ name: "Çeviriciler" }, { name: "Kablolar" }, { name: "Usb Ürünler" }],
      },
      { name: "Güç Kaynakları ve Regülatörler" },
      { name: "Oyuncu (Gaming) Koltukları" },
      { name: "Web Cam" },
    ],
  },
  {
    name: "Yazıcılar",
    slug: "yazicilar",
    children: [
      { name: "Kartuşlar (Orjinal)" },
      { name: "Kartuşlar (Muadil)" },
      { name: "Toner (Orjinal)" },
      { name: "Toner (Muadil)" },
      { name: "Laser Yazıcılar" },
      { name: "Inkjet (Kartuş) Yazıcılar" },
      { name: "Tanklı Yazıcılar" },
      { name: "Nokta Vuruşlu Yazıcılar" },
    ],
  },
  {
    name: "Telefonlar ve Eko Sistem",
    slug: "telefon",
    children: [{ name: "Apple" }, { name: "Samsung" }, { name: "Xiaomi" }],
  },
  {
    name: "Tüketici Elektroniği",
    slug: "tuketici-elektronigi",
    children: [
      { name: "Televizyonlar" },
      { name: "Projeksiyonlar" },
      { name: "Telsiz (Dect) Telefonlar" },
      { name: "TV Sarf ve Aksesuarları" },
      { name: "Oyun Konsolu ve Kolları" },
      { name: "Usb Bellek ve Hafıza Kartları" },
      { name: "Akıllı Saatler" },
      { name: "KLİMALAR" },
    ],
  },
  { name: "Ev/Bakım Ürünleri", slug: "ev-bakim" },
  { name: "2. El Ürünler", slug: "2-el-urunler" },
];

function build(nodes: RawCategory[], parentSlug = ""): CatalogNode[] {
  return nodes.map((node) => {
    const slug =
      node.slug ?? slugify(parentSlug ? `${parentSlug}-${node.name}` : node.name);
    return {
      name: node.name,
      slug,
      href: `/kategori/${slug}`,
      children: build(node.children ?? [], slug),
    };
  });
}

export const STORE_CATEGORIES: CatalogNode[] = build(RAW_CATEGORIES);

export function flattenCategories(nodes: CatalogNode[] = STORE_CATEGORIES): CatalogNode[] {
  return nodes.flatMap((node) => [node, ...flattenCategories(node.children)]);
}

export function findCategory(slug: string): CatalogNode | null {
  return flattenCategories().find((node) => node.slug === slug) ?? null;
}

export function findCategoryByName(name: string): CatalogNode | null {
  return flattenCategories().find((node) => node.name === name) ?? null;
}

export function categoryHref(name: string) {
  return findCategoryByName(name)?.href ?? "/urunler";
}

export function categoryFilterGroups() {
  return STORE_CATEGORIES.map((category) => {
    const options = flattenCategories(category.children);
    return {
      id: category.slug,
      label: category.name,
      href: category.href,
      options: (options.length ? options : [category]).map((node) => ({
        id: node.slug,
        label: node.name,
        href: node.href,
      })),
    };
  });
}
