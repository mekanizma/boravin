import { getLocale, getTranslations } from "next-intl/server";
import { Star } from "lucide-react";
import { DetailCard } from "@/components/storefront/detail-card";
import { ProductReviewForm } from "@/components/storefront/product-review-form";
import { listApprovedProductReviews } from "@/features/reviews/actions";
import { getCurrentCustomer } from "@/lib/account/session";
import { cn } from "@/lib/utils";
import { formatDateLocale } from "@/lib/i18n/format";
import type { AppLocale } from "@/i18n/config";

function Stars({ rating }: { rating: number }) {
  return (
    <span className="inline-flex items-center gap-0.5" aria-label={`${rating} / 5`}>
      {[1, 2, 3, 4, 5].map((value) => (
        <Star
          key={value}
          className={cn(
            "h-3.5 w-3.5",
            value <= rating
              ? "fill-[var(--bv-sale)] text-[var(--bv-sale)]"
              : "text-[var(--bv-border-strong)]",
          )}
        />
      ))}
    </span>
  );
}

export async function ProductReviewsSection({
  productId,
  defaultName,
}: {
  productId: string;
  defaultName?: string;
}) {
  const t = await getTranslations("Reviews");
  const locale = (await getLocale()) as AppLocale;
  let items: Awaited<ReturnType<typeof listApprovedProductReviews>> = [];
  let resolvedName = defaultName ?? "";
  try {
    const [reviews, customer] = await Promise.all([
      listApprovedProductReviews(productId),
      resolvedName
        ? Promise.resolve(null)
        : getCurrentCustomer().catch(() => null),
    ]);
    items = reviews;
    if (!resolvedName && customer) {
      resolvedName = [customer.firstName, customer.lastName]
        .filter(Boolean)
        .join(" ");
    }
  } catch {
    items = [];
  }

  const avg =
    items.length > 0
      ? items.reduce((sum, item) => sum + item.rating, 0) / items.length
      : 0;

  return (
    <section className="mt-10 sm:mt-12">
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3 border-b border-[var(--bv-border)] pb-3">
        <div>
          <h2 className="font-display text-xl font-semibold sm:text-2xl">{t("title")}</h2>
          <p className="mt-1 text-sm text-[var(--bv-muted)]">
            {items.length
              ? t("summary", { count: items.length, avg: avg.toFixed(1) })
              : t("noneApproved")}
          </p>
        </div>
      </div>

      <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1.35fr)_minmax(16rem,0.65fr)] lg:gap-5">
        <div className="space-y-3">
          {items.length === 0 ? (
            <DetailCard className="p-5 sm:p-6">
              <p className="text-sm text-[var(--bv-muted)]">{t("emptyList")}</p>
            </DetailCard>
          ) : (
            items.map((item) => (
              <DetailCard key={item.id} className="p-4 sm:p-5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm font-semibold">
                    {item.authorName ?? t("customerFallback")}
                  </p>
                  <Stars rating={item.rating} />
                </div>
                {item.title ? (
                  <p className="mt-2 text-sm font-medium">{item.title}</p>
                ) : null}
                {item.body ? (
                  <p className="mt-2 text-sm leading-relaxed text-[var(--bv-slate)] whitespace-pre-wrap">
                    {item.body}
                  </p>
                ) : null}
                <p className="mt-3 text-xs text-[var(--bv-muted)]">
                  {item.createdAt
                    ? formatDateLocale(item.createdAt, locale)
                    : null}
                </p>
              </DetailCard>
            ))
          )}
        </div>

        <DetailCard className="h-fit p-4 sm:p-5">
          <h3 className="font-display text-lg font-semibold">{t("writeTitle")}</h3>
          <div className="mt-3">
            <ProductReviewForm
              productId={productId}
              defaultName={resolvedName || undefined}
            />
          </div>
        </DetailCard>
      </div>
    </section>
  );
}
