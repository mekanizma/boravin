import Link from "next/link";
import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { db, getDb, isTransientDbError, recoverDb } from "@/lib/db";
import { brands, categories, productImages, productVariants, products } from "@/lib/db/schema";
import { formatCurrency } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ProductGallery } from "@/components/storefront/product-gallery";
import { ProductBuyPanel } from "@/components/storefront/product-buy-panel";
import { DetailCard } from "@/components/storefront/detail-card";
import { loadProductCards } from "@/lib/storefront/products";
import { ProductGrid } from "@/components/storefront/product-grid";
import { findMockProduct } from "@/lib/mock/storefront";
import type { Metadata } from "next";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const mock = findMockProduct(slug);
  try {
    const product = await db.query.products.findFirst({
      where: eq(products.slug, slug),
    });
    if (product) {
      return {
        title: product.seoTitle ?? product.name,
        description: product.seoDescription ?? product.shortDescription ?? undefined,
      };
    }
  } catch {
    // Fall through to the mock catalog.
  }
  if (mock) return { title: mock.name, description: mock.brandName ?? undefined };
  return { title: "Ürün" };
}

async function loadProduct(slug: string) {
  const run = async () => {
    const database = getDb();
    const product = await database.query.products.findFirst({
      where: eq(products.slug, slug),
    });
    if (!product) return null;

    const [images, brand, category, variants] = await Promise.all([
      database
        .select()
        .from(productImages)
        .where(eq(productImages.productId, product.id)),
      product.brandId
        ? database.query.brands.findFirst({
            where: eq(brands.id, product.brandId),
          })
        : Promise.resolve(null),
      product.categoryId
        ? database.query.categories.findFirst({
            where: eq(categories.id, product.categoryId),
          })
        : Promise.resolve(null),
      database
        .select()
        .from(productVariants)
        .where(eq(productVariants.productId, product.id)),
    ]);

    return { ...product, images, brand: brand ?? null, category: category ?? null, variants };
  };

  try {
    return await run();
  } catch (error) {
    if (!isTransientDbError(error)) throw error;
    await recoverDb();
    return await run();
  }
}

export default async function ProductDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const product = await loadProduct(slug);

  if (!product) {
    const mock = findMockProduct(slug);
    if (!mock) notFound();
    const related = await loadProductCards({ limit: 4 });
    const price = Number(mock.price);
    const compare = mock.compareAtPrice ? Number(mock.compareAtPrice) : null;
    return (
      <div className="container-bv py-6 sm:py-10">
        <nav className="mb-6 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-[var(--bv-muted)]">
          <Link href="/" className="hover:text-[var(--bv-ink)]">Anasayfa</Link>
          <span aria-hidden>/</span>
          <Link href="/urunler" className="hover:text-[var(--bv-ink)]">Ürünler</Link>
          <span aria-hidden>/</span>
          <span className="text-[var(--bv-ink)]">{mock.name}</span>
        </nav>
        <div className="grid items-start gap-8 lg:grid-cols-[minmax(0,1.15fr)_minmax(18rem,0.85fr)] lg:gap-14">
          <ProductGallery
            images={
              mock.imageUrl
                ? [{ id: mock.id, url: mock.imageUrl, alt: mock.name }]
                : []
            }
          />
          <div>
            {mock.brandName ? (
              <p className="text-xs font-semibold tracking-[0.16em] text-[var(--bv-muted)] uppercase">
                {mock.brandName}
              </p>
            ) : null}
            <h1 className="mt-2 font-display text-3xl font-semibold tracking-tight sm:text-4xl">
              {mock.name}
            </h1>
            <p className="mt-3 text-sm text-[var(--bv-slate)]">Önizleme ürünü</p>
            <DetailCard className="p-4 sm:p-6" stageClassName="mt-6">
              {compare && compare > price ? (
                <p className="text-sm text-[var(--bv-muted)] line-through">
                  {formatCurrency(compare)}
                </p>
              ) : null}
              <p className="font-display text-3xl font-semibold">
                {formatCurrency(price)}
              </p>
              <p className="mt-4 text-sm text-[var(--bv-slate)]">
                Bu kart vitrin önizlemesi. Satın almak için katalogdaki satıştaki ürünü kullanın.
              </p>
              <Link href="/urunler" className="mt-6 block">
                <Button variant="accent" size="lg" className="w-full">
                  Ürünlere dön
                </Button>
              </Link>
            </DetailCard>
          </div>
        </div>
        {related.length ? (
          <section className="mt-14">
            <h2 className="mb-4 font-display text-xl font-semibold">Benzer ürünler</h2>
            <ProductGrid products={related} />
          </section>
        ) : null}
      </div>
    );
  }

  const related = await loadProductCards({ limit: 4 });
  const images = [...(product.images ?? [])].sort(
    (a, b) =>
      Number(b.isPrimary) - Number(a.isPrimary) || a.sortOrder - b.sortOrder,
  );
  const primary = images[0];
  const compare = product.compareAtPrice ? Number(product.compareAtPrice) : null;
  const specEntries = Object.entries({
    ...(product.specs ?? {}),
    ...(product.technicalSpecs ?? {}),
  }).filter(([, value]) => Boolean(value));

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    description: product.shortDescription,
    sku: product.sku,
    brand: product.brand?.name,
    image: product.images?.map((i) => i.url),
    offers: {
      "@type": "Offer",
      priceCurrency: "TRY",
      price: product.price,
      availability:
        product.stock > 0
          ? "https://schema.org/InStock"
          : "https://schema.org/OutOfStock",
    },
  };

  return (
    <div className="container-bv py-6 sm:py-10">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <nav className="mb-6 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-[var(--bv-muted)]">
        <Link href="/" className="hover:text-[var(--bv-ink)]">
          Anasayfa
        </Link>
        <span aria-hidden>/</span>
        <Link href="/urunler" className="hover:text-[var(--bv-ink)]">
          Ürünler
        </Link>
        {product.category ? (
          <>
            <span aria-hidden>/</span>
            <Link
              href={`/kategori/${product.category.slug}`}
              className="hover:text-[var(--bv-ink)]"
            >
              {product.category.name}
            </Link>
          </>
        ) : null}
        <span aria-hidden>/</span>
        <span className="max-w-[16rem] truncate text-[var(--bv-ink)] sm:max-w-none">
          {product.name}
        </span>
      </nav>

      <div className="grid items-start gap-8 lg:grid-cols-[minmax(0,1.15fr)_minmax(20rem,0.85fr)] lg:gap-20">
        <ProductGallery
          images={images.map((image) => ({
            id: image.id,
            url: image.url,
            alt: image.alt ?? product.name,
          }))}
        />

        <div className="lg:sticky lg:top-36">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            {product.brand ? (
              <p className="text-xs font-semibold tracking-[0.16em] text-[var(--bv-muted)] uppercase">
                {product.brand.name}
              </p>
            ) : null}
            {product.isNew ? (
              <span className="text-xs font-semibold text-[var(--bv-teal)]">Yeni</span>
            ) : null}
            {product.isCampaign ? (
              <span className="text-xs font-semibold text-[var(--bv-sale)]">Kampanya</span>
            ) : null}
          </div>
          <h1 className="mt-2 font-display text-3xl font-semibold tracking-tight text-balance sm:text-4xl">
            {product.name}
          </h1>
          <p className="mt-3 text-sm text-[var(--bv-muted)]">SKU {product.sku}</p>
          {product.shortDescription ? (
            <p className="mt-4 max-w-prose text-sm leading-relaxed text-[var(--bv-slate)] sm:text-base">
              {product.shortDescription}
            </p>
          ) : null}

          <ProductBuyPanel
            product={{
              id: product.id,
              name: product.name,
              slug: product.slug,
              price: Number(product.price),
              imageUrl: primary?.url ?? null,
            }}
            basePrice={Number(product.price)}
            compareAtPrice={compare}
            stock={product.stock}
            variants={(product.variants ?? [])
              .filter((variant) => variant.isActive)
              .map((variant) => ({
                id: variant.id,
                name: variant.name,
                price: variant.price ? Number(variant.price) : null,
                stock: variant.stock,
              }))}
          />
        </div>
      </div>

      <section className="mt-12 sm:mt-16">
        <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1.4fr)_minmax(16rem,0.7fr)] lg:gap-6">
          <DetailCard className="p-5 sm:p-7">
            <h2 className="font-display text-2xl font-semibold">Ürün bilgisi</h2>
            {product.description ? (
              <p className="mt-4 max-w-prose whitespace-pre-wrap text-sm leading-7 text-[var(--bv-slate)] sm:text-base">
                {product.description}
              </p>
            ) : (
              <p className="mt-4 text-sm text-[var(--bv-muted)]">
                Bu ürün için açıklama eklenmemiş.
              </p>
            )}
            {specEntries.length > 0 ? (
              <dl className="mt-8 divide-y divide-[var(--bv-border)] border-y border-[var(--bv-border)]">
                {specEntries.map(([label, value]) => (
                  <div
                    key={label}
                    className="grid grid-cols-1 gap-1 py-3 sm:grid-cols-[10rem_minmax(0,1fr)] sm:gap-6"
                  >
                    <dt className="text-sm text-[var(--bv-muted)]">{label}</dt>
                    <dd className="text-sm font-medium text-[var(--bv-ink)]">{value}</dd>
                  </div>
                ))}
              </dl>
            ) : null}
          </DetailCard>
          <DetailCard className="h-fit p-2 sm:p-3">
            <dl className="divide-y divide-[var(--bv-border)]">
              {(
                [
                  ["Marka", product.brand?.name],
                  ["Kategori", product.category?.name],
                  ["SKU", product.sku],
                  ["Stok", product.stock > 0 ? `${product.stock} adet` : "Tükendi"],
                ] as const
              )
                .filter((row): row is readonly [string, string] => Boolean(row[1]))
                .map(([label, value]) => (
                  <div key={label} className="flex items-baseline justify-between gap-4 px-3 py-3">
                    <dt className="text-sm text-[var(--bv-muted)]">{label}</dt>
                    <dd className="text-right text-sm font-semibold">{value}</dd>
                  </div>
                ))}
            </dl>
          </DetailCard>
        </div>
      </section>

      <section className="mt-14 sm:mt-16">
        <div className="mb-6 flex items-end justify-between gap-4 border-b border-[var(--bv-border)] pb-3">
          <h2 className="font-display text-2xl font-semibold">Benzer ürünler</h2>
          <Link href="/urunler" className="text-sm font-medium text-[var(--bv-teal)]">
            Tüm ürünler
          </Link>
        </div>
        <ProductGrid products={related.filter((p) => p.id !== product.id)} />
      </section>
    </div>
  );
}
