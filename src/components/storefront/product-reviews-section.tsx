import { Star } from "lucide-react";
import { DetailCard } from "@/components/storefront/detail-card";
import { ProductReviewForm } from "@/components/storefront/product-review-form";
import { listApprovedProductReviews } from "@/features/reviews/actions";
import { cn } from "@/lib/utils";

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
  let items: Awaited<ReturnType<typeof listApprovedProductReviews>> = [];
  try {
    items = await listApprovedProductReviews(productId);
  } catch {
    items = [];
  }

  const avg =
    items.length > 0
      ? items.reduce((sum, item) => sum + item.rating, 0) / items.length
      : 0;

  return (
    <section className="mt-12 sm:mt-16">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3 border-b border-[var(--bv-border)] pb-3">
        <div>
          <h2 className="font-display text-2xl font-semibold">Yorumlar</h2>
          <p className="mt-1 text-sm text-[var(--bv-muted)]">
            {items.length
              ? `${items.length} onaylı yorum · Ort. ${avg.toFixed(1)}/5`
              : "Henüz onaylanmış yorum yok"}
          </p>
        </div>
      </div>

      <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1.2fr)_minmax(16rem,0.8fr)] lg:gap-6">
        <div className="space-y-3">
          {items.length === 0 ? (
            <DetailCard className="p-5 sm:p-6">
              <p className="text-sm text-[var(--bv-muted)]">
                Bu ürün için henüz yayınlanmış yorum bulunmuyor. İlk yorumu siz
                yazabilirsiniz; admin onayından sonra görünür.
              </p>
            </DetailCard>
          ) : (
            items.map((item) => (
              <DetailCard key={item.id} className="p-4 sm:p-5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm font-semibold">
                    {item.authorName ?? "Müşteri"}
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
                    ? new Date(item.createdAt).toLocaleDateString("tr-TR")
                    : null}
                </p>
              </DetailCard>
            ))
          )}
        </div>

        <DetailCard className="h-fit p-4 sm:p-5">
          <h3 className="font-display text-lg font-semibold">Yorum yaz</h3>
          <div className="mt-3">
            <ProductReviewForm
              productId={productId}
              defaultName={defaultName}
            />
          </div>
        </DetailCard>
      </div>
    </section>
  );
}
