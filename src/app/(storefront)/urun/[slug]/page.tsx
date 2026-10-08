import Link from "next/link";
import { notFound } from "next/navigation";
import { cache, Suspense } from "react";
import { eq } from "drizzle-orm";
import { getDb, isTransientDbError, recoverDb } from "@/lib/db";
import { brands, categories, productImages, productVariants, products } from "@/lib/db/schema";
import { Button } from "@/components/ui/button";
import { ProductGallery } from "@/components/storefront/product-gallery";
import { ProductBuyPanel } from "@/components/storefront/product-buy-panel";
import { DetailCard } from "@/components/storefront/detail-card";
import { ProductReviewsSection } from "@/components/storefront/product-reviews-section";
import { loadCachedProductCards } from "@/lib/storefront/products";
import { ProductGrid } from "@/components/storefront/product-grid";
import { findMockProduct } from "@/lib/mock/storefront";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { formatMoneyServer } from "@/lib/i18n/format";
import { translateCategoryName } from "@/lib/storefront/use-category-label";
import { publicImageUrl } from "@/lib/media/url";

/** Avoid "Name | Boravin | Boravin" when seoTitle already includes the site name. */
function pageTitle(raw: string | null | undefined, fallback: string) {
  const value = (raw ?? fallback).trim();
  return value.replace(/\s*\|\s*Boravin\s*$/i, "").trim() || fallback;
}

const loadProduct = cache(async (slug: string) => {
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
    // Connection/SSL/schema errors are not transient WASM aborts — still fall back to mock.
    if (isTransientDbError(error)) {
      try {
        await recoverDb();
        return await run();
      } catch (retryError) {
        console.error("[product] load retry failed", retryError);
        return null;
      }
    }
    console.error("[product] load failed", error);
    return null;
  }
});

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const product = await loadProduct(slug);
  if (product) {
    return {
      title: pageTitle(product.seoTitle, product.name),
      description: product.seoDescription ?? product.shortDescription ?? undefined,
    };
  }
  const mock = findMockProduct(slug);
  if (mock) return { title: mock.name, description: mock.brandName ?? undefined };
  const t = await getTranslations("Product");
  return { title: t("metadataFallback") };
}

export default async function ProductDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const t = await getTranslations("Product");
  const tCommon = await getTranslations("Common");
  const tc = await getTranslations("CatalogCategories");
  const { slug } = await params;
  const product = await loadProduct(slug);

  if (!product) {
    const mock = findMockProduct(slug);
    if (!mock) notFound();
    const related = await loadCachedProductCards({ limit: 4 });
    const price = Number(mock.price);
    const compare = mock.compareAtPrice ? Number(mock.compareAtPrice) : null;
    return (
      <div className="container-bv py-6 sm:py-10">
        <nav className="mb-5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-[var(--bv-muted)] sm:mb-7">
          <Link href="/" className="hover:text-[var(--bv-ink)]">{t("breadcrumbHome")}</Link>
          <span aria-hidden>/</span>
          <Link href="/urunler" className="hover:text-[var(--bv-ink)]">{t("breadcrumbProducts")}</Link>
          <span aria-hidden>/</span>
          <span className="text-[var(--bv-ink)]">{mock.name}</span>
        </nav>
        <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1.2fr)_minmax(19rem,0.8fr)] lg:gap-12 xl:gap-16">
          <ProductGallery
            images={
              mock.imageUrl
                ? [{ id: mock.id, url: mock.imageUrl, alt: mock.name }]
                : []
            }
          />
          <div className="min-w-0">
            {mock.brandName ? (
              <p className="text-xs font-semibold tracking-[0.16em] text-[var(--bv-muted)] uppercase">
                {mock.brandName}
              </p>
            ) : null}
            <h1 className="mt-3 font-display text-3xl font-semibold tracking-tight sm:text-[2.15rem] sm:leading-tight">
              {mock.name}
            </h1>
            <p className="mt-3 text-sm text-[var(--bv-slate)]">{t("previewBadge")}</p>
            <DetailCard className="p-4 sm:p-6" stageClassName="mt-5 sm:mt-6">
              {compare && compare > price ? (
                <p className="text-sm text-[var(--bv-muted)] line-through">
                  {await formatMoneyServer(compare)}
                </p>
              ) : null}
              <p className="font-display text-3xl font-semibold">
                {await formatMoneyServer(price)}
              </p>
              <p className="mt-4 text-sm text-[var(--bv-slate)]">
                {t("previewBody")}
              </p>
              <Link href="/urunler" className="mt-6 block">
                <Button variant="accent" size="lg" className="w-full">
                  {t("backToProducts")}
                </Button>
              </Link>
            </DetailCard>
          </div>
        </div>
        {related.length ? (
          <section className="mt-12 sm:mt-14">
            <h2 className="mb-5 font-display text-xl font-semibold sm:text-2xl">{t("related")}</h2>
            <ProductGrid products={related} />
          </section>
        ) : null}
      </div>
    );
  }

  const images = [...(product.images ?? [])].sort(
    (a, b) =>
      Number(b.isPrimary) - Number(a.isPrimary) || a.sortOrder - b.sortOrder,
  );
  const primary = images[0];
  const compare = product.compareAtPrice ? Number(product.compareAtPrice) : null;
  const specEntries = Object.entries({
    ...(product.specs && typeof product.specs === "object" ? product.specs : {}),
    ...(product.technicalSpecs && typeof product.technicalSpecs === "object"
      ? product.technicalSpecs
      : {}),
  })
    .map(([label, value]) => {
      if (value == null || value === "") return null;
      if (typeof value === "string" || typeof value === "number") {
        return [label, String(value)] as const;
      }
      try {
        return [label, JSON.stringify(value)] as const;
      } catch {
        return null;
      }
    })
    .filter((row): row is readonly [string, string] => Boolean(row));

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
      <nav className="mb-5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-[var(--bv-muted)] sm:mb-7">
        <Link href="/" className="hover:text-[var(--bv-ink)]">
          {t("breadcrumbHome")}
        </Link>
        <span aria-hidden>/</span>
        <Link href="/urunler" className="hover:text-[var(--bv-ink)]">
          {t("breadcrumbProducts")}
        </Link>
        {product.category ? (
          <>
            <span aria-hidden>/</span>
            <Link
              href={`/kategori/${product.category.slug}`}
              className="hover:text-[var(--bv-ink)]"
            >
              {translateCategoryName((key) => tc(key as never), {
                slug: product.category.slug,
                name: product.category.name,
              })}
            </Link>
          </>
        ) : null}
        <span aria-hidden>/</span>
        <span className="max-w-[16rem] truncate text-[var(--bv-ink)] sm:max-w-none">
          {product.name}
        </span>
      </nav>

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1.2fr)_minmax(19rem,0.8fr)] lg:gap-12 xl:gap-16">
        <ProductGallery
          images={images
            .map((image) => ({
              id: image.id,
              url: publicImageUrl(image.url) ?? "",
              alt: image.alt ?? product.name,
            }))
            .filter((image) => Boolean(image.url))}
        />

        <div className="min-w-0 lg:sticky lg:top-28 lg:self-start">
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
              {product.brand ? (
                <p className="text-xs font-semibold tracking-[0.16em] text-[var(--bv-muted)] uppercase">
                  {product.brand.name}
                </p>
              ) : null}
              {product.isNew ? (
                <span className="text-xs font-semibold text-[var(--bv-teal)]">
                  {t("new")}
                </span>
              ) : null}
              {product.isCampaign ? (
                <span className="text-xs font-semibold text-[var(--bv-sale)]">
                  {t("campaign")}
                </span>
              ) : null}
            </div>

            <h1 className="font-display text-3xl font-semibold tracking-tight text-balance sm:text-[2.15rem] sm:leading-tight">
              {product.name}
            </h1>

            <p className="text-xs text-[var(--bv-muted)] sm:text-sm">
              {tCommon("skuLabel", { sku: product.sku })}
              {product.category ? (
                <>
                  <span className="mx-1.5 text-[var(--bv-border-strong)]" aria-hidden>
                    ·
                  </span>
                  <Link
                    href={`/kategori/${product.category.slug}`}
                    className="hover:text-[var(--bv-ink)]"
                  >
                    {translateCategoryName((key) => tc(key as never), {
                      slug: product.category.slug,
                      name: product.category.name,
                    })}
                  </Link>
                </>
              ) : null}
            </p>

            {product.shortDescription ? (
              <p className="max-w-prose text-sm leading-relaxed text-[var(--bv-slate)]">
                {product.shortDescription}
              </p>
            ) : null}
          </div>

          <ProductBuyPanel
            product={{
              id: product.id,
              name: product.name,
              slug: product.slug,
              price: Number(product.price),
              imageUrl: publicImageUrl(primary?.url ?? null),
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

      <section className="mt-10 sm:mt-14">
        <DetailCard className="p-5 sm:p-7" stageClassName="px-0">
          <h2 className="font-display text-xl font-semibold sm:text-2xl">
            {t("infoTitle")}
          </h2>
          {product.description ? (
            <p className="mt-4 max-w-3xl whitespace-pre-wrap text-sm leading-7 text-[var(--bv-slate)] sm:text-base">
              {product.description}
            </p>
          ) : (
            <p className="mt-4 text-sm text-[var(--bv-muted)]">
              {t("noDescription")}
            </p>
          )}

          {specEntries.length > 0 ? (
            <div className="mt-8 border-t border-[var(--bv-border)] pt-6">
              <h3 className="text-sm font-semibold tracking-[0.08em] text-[var(--bv-muted)] uppercase">
                {t("specsTitle")}
              </h3>
              <dl className="mt-4 grid gap-x-10 gap-y-0 sm:grid-cols-2">
                {specEntries.map(([label, value]) => (
                  <div
                    key={label}
                    className="grid grid-cols-[minmax(0,9rem)_minmax(0,1fr)] gap-3 border-b border-[var(--bv-border)] py-3 last:border-b-0 sm:last:border-b"
                  >
                    <dt className="text-sm text-[var(--bv-muted)]">{label}</dt>
                    <dd className="text-sm font-medium text-[var(--bv-ink)]">
                      {value}
                    </dd>
                  </div>
                ))}
              </dl>
            </div>
          ) : null}
        </DetailCard>
      </section>

      <Suspense
        fallback={
          <div className="mt-10 h-40 animate-pulse rounded-[var(--radius-lg)] bg-[#e2e7ec] sm:mt-12" />
        }
      >
        <ProductReviewsSection productId={product.id} />
      </Suspense>

      <Suspense
        fallback={
          <div className="mt-12 h-56 animate-pulse rounded-[var(--radius-lg)] bg-[#e2e7ec] sm:mt-14" />
        }
      >
        <RelatedProductsSection
          excludeId={product.id}
          title={t("related")}
          allLabel={t("allProducts")}
        />
      </Suspense>
    </div>
  );
}

async function RelatedProductsSection({
  excludeId,
  title,
  allLabel,
}: {
  excludeId: string;
  title: string;
  allLabel: string;
}) {
  const related = await loadCachedProductCards({ limit: 4 });
  const products = related.filter((p) => p.id !== excludeId);
  if (!products.length) return null;

  return (
    <section className="mt-12 sm:mt-14">
      <div className="mb-5 flex items-end justify-between gap-4 border-b border-[var(--bv-border)] pb-3">
        <h2 className="font-display text-xl font-semibold sm:text-2xl">
          {title}
        </h2>
        <Link
          href="/urunler"
          className="shrink-0 text-sm font-medium text-[var(--bv-teal)]"
        >
          {allLabel}
        </Link>
      </div>
      <ProductGrid products={products} />
    </section>
  );
}
