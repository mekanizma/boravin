import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";
import { getCheckoutBundle } from "@/features/cart/actions";
import { formatMoneyServer } from "@/lib/i18n/format";
import { translateVariantLabel } from "@/lib/i18n/variant-label";
import { Button } from "@/components/ui/button";
import { CartLineControls } from "@/components/storefront/cart-line-controls";

export async function generateMetadata() {
  const t = await getTranslations("Cart");
  return { title: t("metadataTitle") };
}

export default async function CartPage() {
  const t = await getTranslations("Cart");
  const tCommon = await getTranslations("Common");
  const locale = await getLocale();
  const { items, totals } = await getCheckoutBundle();
  const [subtotal, discount, shipping, grandTotal] = await Promise.all([
    formatMoneyServer(totals.subtotal),
    formatMoneyServer(totals.discount),
    formatMoneyServer(totals.shipping),
    formatMoneyServer(totals.grandTotal),
  ]);

  if (!items.length) {
    return (
      <div className="container-bv py-16 text-center">
        <h1 className="font-display text-3xl font-bold">{t("emptyTitle")}</h1>
        <p className="mt-2 text-[var(--bv-muted)]">{t("emptyBody")}</p>
        <Link href="/urunler" className="mt-6 inline-block">
          <Button variant="accent">{t("browseProducts")}</Button>
        </Link>
      </div>
    );
  }

  const pricedItems = await Promise.all(
    items.map(async (item) => ({
      ...item,
      priceLabel: await formatMoneyServer(Number(item.unitPrice)),
    })),
  );

  return (
    <div className="container-bv py-8 sm:py-12">
      <h1 className="font-display text-3xl font-bold">{t("title")}</h1>
      <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_20rem]">
        <ul className="space-y-4">
          {pricedItems.map((item) => (
            <li
              key={item.id}
              className="flex flex-col gap-3 border-b border-[var(--bv-border)] pb-4 sm:flex-row sm:items-center sm:justify-between"
            >
              <div>
                <p className="font-medium">
                  {item.product?.name ?? tCommon("productFallback")}
                </p>
                {item.variant ? (
                  <p className="text-xs text-[var(--bv-muted)]">
                    {translateVariantLabel(item.variant.name, locale)}
                  </p>
                ) : null}
                <p className="mt-1 text-sm">{item.priceLabel}</p>
              </div>
              <CartLineControls itemId={item.id} quantity={item.quantity} />
            </li>
          ))}
        </ul>
        <aside className="h-fit rounded-[var(--radius-lg)] border border-[var(--bv-border)] bg-white p-4">
          <h2 className="font-semibold">{t("summary")}</h2>
          <dl className="mt-4 space-y-2 text-sm">
            <div className="flex justify-between">
              <dt>{t("subtotal")}</dt>
              <dd>{subtotal}</dd>
            </div>
            <div className="flex justify-between">
              <dt>{t("discount")}</dt>
              <dd>-{discount}</dd>
            </div>
            <div className="flex justify-between">
              <dt>{t("shipping")}</dt>
              <dd>{shipping}</dd>
            </div>
            <div className="flex justify-between border-t border-[var(--bv-border)] pt-2 text-base font-semibold">
              <dt>{t("total")}</dt>
              <dd>{grandTotal}</dd>
            </div>
          </dl>
          <Link href="/odeme" className="mt-4 block">
            <Button variant="accent" className="w-full">
              {t("checkout")}
            </Button>
          </Link>
        </aside>
      </div>
    </div>
  );
}
