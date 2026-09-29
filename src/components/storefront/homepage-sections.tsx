import Link from "next/link";
import Image from "next/image";
import { ArrowRight } from "lucide-react";
import { ProductGrid } from "@/components/storefront/product-grid";
import type { ProductCardData } from "@/components/storefront/product-card";
import { HeroSlider } from "@/components/storefront/hero-slider";
import {
  MOCK_BRANDS,
  MOCK_CATEGORIES,
  MOCK_PRODUCTS,
} from "@/lib/mock/storefront";
import { categoryHref } from "@/lib/storefront/catalog";

export type HomepageSectionItem = {
  id: string;
  title?: string | null;
  subtitle?: string | null;
  imageUrl?: string | null;
  linkUrl?: string | null;
  buttonLabel?: string | null;
  product?: ProductCardData | null;
};

export type HomepageSection = {
  id: string;
  type: string;
  title?: string | null;
  subtitle?: string | null;
  config?: Record<string, unknown> | null;
  items?: HomepageSectionItem[];
  products?: ProductCardData[];
};

const POPULAR = [
  {
    id: "phone",
    title: "Telefonlar ve Eko Sistem",
    href: categoryHref("Telefonlar ve Eko Sistem"),
    image:
      "https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?auto=format&fit=crop&w=360&h=320&q=80",
  },
  {
    id: "notebook",
    title: "Notebook",
    href: categoryHref("Notebook"),
    image:
      "https://images.unsplash.com/photo-1496181133206-80ce9b88a853?auto=format&fit=crop&w=360&h=320&q=80",
  },
  {
    id: "tablet",
    title: "Tabletler",
    href: categoryHref("Tabletler"),
    image:
      "https://images.unsplash.com/photo-1544244015-0df4b3ffc6b0?auto=format&fit=crop&w=360&h=320&q=80",
  },
  {
    id: "monitor",
    title: "Monitörler",
    href: categoryHref("Monitörler"),
    image:
      "https://images.unsplash.com/photo-1527443224154-c4a3942d3acf?auto=format&fit=crop&w=360&h=320&q=80",
  },
  {
    id: "printer",
    title: "Yazıcılar",
    href: categoryHref("Yazıcılar"),
    image:
      "https://images.unsplash.com/photo-1612815154858-60aa4c59eaa6?auto=format&fit=crop&w=360&h=320&q=80",
  },
  {
    id: "console",
    title: "Oyun Konsolu ve Kolları",
    href: categoryHref("Oyun Konsolu ve Kolları"),
    image:
      "https://images.unsplash.com/photo-1606144042614-b2417e99c4e3?auto=format&fit=crop&w=360&h=320&q=80",
  },
  {
    id: "watch",
    title: "Akıllı Saatler",
    href: categoryHref("Akıllı Saatler"),
    image:
      "https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=360&h=320&q=80",
  },
  {
    id: "audio",
    title: "Kulaklık",
    href: categoryHref("Kulaklık"),
    image:
      "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=360&h=320&q=80",
  },
];

function PopularCategories({ section }: { section?: HomepageSection }) {
  const items =
    section?.items && section.items.length
      ? section.items.map((item) => ({
          id: item.id,
          title: item.title || "Kategori",
          href: item.linkUrl || "/urunler",
          image: item.imageUrl || POPULAR[0].image,
        }))
      : POPULAR;

  return (
    <section className="container-bv py-6 sm:py-8">
      <div className="flex flex-col gap-5 rounded-[1.25rem] bg-white p-4 shadow-[0_14px_28px_rgba(18,20,23,0.08),0_4px_0_#d5dae0] sm:flex-row sm:items-center sm:p-5">
        <div className="shrink-0 sm:w-44">
          <p className="text-sm font-semibold text-[#222]">Öne çıkan</p>
          <p className="text-lg font-bold text-[var(--bv-teal)]">Popüler kategoriler</p>
        </div>
        <div className="bv-stage bv-snap-x flex gap-3 overflow-x-auto px-1 pt-3 pb-4 sm:gap-5">
          {items.map((item) => (
            <Link
              key={item.id}
              href={item.href}
              className="bv-disc-link w-[6.75rem] shrink-0 text-center sm:w-[7.5rem]"
            >
              <span className="bv-disc relative mx-auto block h-[4.6rem] w-[4.6rem] overflow-hidden rounded-full bg-[#dfe6ec] sm:h-[5.4rem] sm:w-[5.4rem]">
                <Image src={item.image} alt="" fill sizes="88px" className="object-cover" />
              </span>
              <span className="mt-3 block text-[12px] leading-tight font-semibold text-[#121417] sm:text-[13px]">
                {item.title}
              </span>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}

function Showcase({
  title,
  subtitle,
  products,
}: {
  title: string;
  subtitle?: string;
  products: ProductCardData[];
}) {
  if (!products.length) return null;
  return (
    <section className="container-bv py-2 sm:py-4">
      <div className="mb-4 flex items-end justify-between gap-3 border-b border-[#eee] pb-3">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-[#111] sm:text-2xl">{title}</h2>
          {subtitle ? <p className="mt-1 text-sm text-[#666]">{subtitle}</p> : null}
        </div>
        <Link href="/urunler" className="shrink-0 text-sm font-semibold text-[var(--bv-sale)]">
          Tümünü gör
        </Link>
      </div>
      <ProductGrid products={products.slice(0, 8)} />
    </section>
  );
}

function PromoRow() {
  const cards = [
    {
      title: "Oyunun kurallarını sen koy",
      body: "Kulaklık, mouse, monitör ve konsol. Tek siparişte topla.",
      href: "/urunler?q=gaming",
      image: MOCK_CATEGORIES[2].imageUrl,
    },
    {
      title: "Hazır sisteme göz at",
      body: "Boravin’de seçilen kasalar. Fiyat ve stok aynı ekranda.",
      href: "/urunler",
      image: MOCK_CAMPAIGN_IMAGE,
    },
  ];

  return (
    <section className="container-bv grid gap-5 py-5 sm:grid-cols-2 sm:gap-6 sm:py-8">
      {cards.map((card) => (
        <Link
          key={card.title}
          href={card.href}
          className="bv-plate group block transition-transform duration-200"
        >
          <span className="relative z-10 flex min-h-[13rem] overflow-hidden rounded-[1.1rem] bg-[#121417] text-white shadow-[0_16px_28px_rgba(18,20,23,0.16)] sm:min-h-[15rem]">
            <Image
              src={card.image}
              alt=""
              fill
              sizes="(max-width: 640px) 100vw, 50vw"
              className="object-cover opacity-55"
            />
            <span className="absolute inset-0 bg-gradient-to-t from-[#121417] via-[#121417]/55 to-transparent" />
            <span className="relative mt-auto block p-5">
              <h2 className="text-xl font-bold tracking-tight sm:text-2xl">{card.title}</h2>
              <p className="mt-1 max-w-sm text-sm text-white/75">{card.body}</p>
              <span className="mt-4 inline-flex items-center gap-1 text-sm font-semibold">
                Alışverişe başla
                <ArrowRight className="h-4 w-4" />
              </span>
            </span>
          </span>
        </Link>
      ))}
    </section>
  );
}

const MOCK_CAMPAIGN_IMAGE =
  "https://images.unsplash.com/photo-1593640408182-31c70c8268f5?auto=format&fit=crop&w=1400&h=900&q=80";

function BrandStrip({ section }: { section?: HomepageSection }) {
  const items =
    section?.items && section.items.length
      ? section.items.map((item) => ({
          id: item.id,
          title: item.title || "",
          href: item.linkUrl || "/urunler",
        }))
      : MOCK_BRANDS.map((name) => ({
          id: name,
          title: name,
          href: `/marka/${name.toLowerCase()}`,
        }));

  const loop = [...items, ...items];

  return (
    <section className="container-bv py-6 sm:py-8">
      <div className="mb-3 flex items-end justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold tracking-[0.16em] text-[var(--bv-muted)] uppercase">
            Partnerler
          </p>
          <h2 className="mt-1 text-sm font-semibold text-[#222] sm:text-base">
            Markalar
          </h2>
        </div>
        <Link
          href="/urunler"
          className="text-[12px] font-semibold text-[var(--bv-sale)] hover:text-[var(--bv-sale-hover)]"
        >
          Tümünü gör
        </Link>
      </div>

      <div className="bv-brand-marquee relative overflow-hidden border border-[var(--bv-border)] bg-white py-3">
        <div className="bv-brand-rail flex w-max gap-2.5 pr-2.5" aria-hidden={false}>
          {loop.map((item, index) => (
            <Link
              key={`${item.id}-${index}`}
              href={item.href}
              tabIndex={index >= items.length ? -1 : undefined}
              aria-hidden={index >= items.length ? true : undefined}
              className="bv-brand-chip inline-flex h-11 shrink-0 items-center rounded-xl bg-[var(--bv-fog)] px-5 text-sm font-semibold text-[#121417] transition-colors hover:bg-[var(--bv-sale)] hover:text-white"
            >
              {item.title}
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}

function NewsletterBlock({ section }: { section?: HomepageSection }) {
  return (
    <section className="border-y border-[#eee] bg-[#fafafa]">
      <div className="container-bv grid gap-4 py-8 sm:py-10 lg:grid-cols-[1.2fr_1fr] lg:items-center">
        <div>
          <h2 className="text-xl font-bold tracking-tight sm:text-2xl">
            {section?.title || "Kampanya ve stok haberleri"}
          </h2>
          <p className="mt-2 max-w-md text-sm text-[#666]">
            {section?.subtitle || "Sadece fiyat ve stok duyuruları. İstediğin zaman çık."}
          </p>
        </div>
        <form className="flex flex-col gap-2 sm:flex-row">
          <label className="sr-only" htmlFor="bv-newsletter-email">
            E-posta
          </label>
          <input
            id="bv-newsletter-email"
            type="email"
            required
            name="email"
            placeholder="E-posta adresin"
            className="h-11 flex-1 rounded-md border border-[#ddd] bg-white px-3 text-base outline-none focus:border-black sm:text-sm"
          />
          <button
            type="submit"
            className="h-11 rounded-md bg-black px-5 text-sm font-semibold text-white hover:bg-[#333]"
          >
            Kaydol
          </button>
        </form>
      </div>
    </section>
  );
}

function productsFromSection(section: HomepageSection): ProductCardData[] {
  return (
    section.products ??
    ((section.items ?? []).map((item) => item.product).filter(Boolean) as ProductCardData[])
  );
}

function poolFrom(
  sections: HomepageSection[],
  featured?: ProductCardData | null,
  extra: ProductCardData[] = [],
) {
  const fromSections = sections
    .filter((section) => ["products", "featured", "new"].includes(section.type))
    .flatMap(productsFromSection);
  const merged = [...fromSections, ...extra, ...(featured ? [featured] : []), ...MOCK_PRODUCTS];
  const seen = new Set<string>();
  return merged.filter((product) => {
    if (seen.has(product.id)) return false;
    seen.add(product.id);
    return true;
  });
}

export function HomepageSections({
  sections,
  featuredProduct,
}: {
  sections: HomepageSection[];
  featuredProduct?: ProductCardData | null;
}) {
  const categories = sections.find((section) => section.type === "categories");
  const brands = sections.find((section) => section.type === "brands");
  const newsletter = sections.find((section) => section.type === "newsletter");
  const productSections = sections.filter((section) =>
    ["products", "featured", "new"].includes(section.type),
  );
  const pool = poolFrom(sections, featuredProduct);
  const first = productSections[0]
    ? productsFromSection(productSections[0])
    : pool;
  const second = productSections[1] ? productsFromSection(productSections[1]) : pool.slice(4);

  return (
    <>
      <HeroSlider />
      <PopularCategories section={categories} />
      <Showcase
        title={productSections[0]?.title || "Öne çıkan hazır sistemler"}
        subtitle={
          productSections[0]?.subtitle ||
          "Boravin’de sizin için seçilen ürünlere göz atın."
        }
        products={first.length ? first : pool}
      />
      <PromoRow />
      <Showcase
        title={productSections[1]?.title || "Bu haftanın vitrini"}
        subtitle={productSections[1]?.subtitle || "Stoktaki telefon, laptop ve ekipman."}
        products={second.length ? second : pool}
      />
      <BrandStrip section={brands} />
      <NewsletterBlock section={newsletter} />
    </>
  );
}

export function FallbackHero({
  featured,
  products = [],
}: {
  featured?: ProductCardData | null;
  products?: ProductCardData[];
}) {
  const pool = poolFrom([], featured, products);
  return (
    <>
      <HeroSlider />
      <PopularCategories />
      <Showcase
        title="Öne çıkan hazır sistemler"
        subtitle="Boravin’de sizin için seçilen ürünlere göz atın."
        products={pool.slice(0, 4)}
      />
      <PromoRow />
      <Showcase
        title="Bu haftanın vitrini"
        subtitle="Stoktaki telefon, laptop ve ekipman."
        products={pool.slice(4, 8)}
      />
      <BrandStrip />
      <NewsletterBlock />
    </>
  );
}
