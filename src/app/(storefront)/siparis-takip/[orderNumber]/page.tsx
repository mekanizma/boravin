import { getLocale, getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";
import { OrderDetailView } from "@/components/storefront/order-detail-view";
import { formatMoney, formatDateLocale } from "@/lib/i18n/format";
import type { AppLocale } from "@/i18n/config";
import { getOrderForViewer } from "@/lib/storefront/orders";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ orderNumber: string }>;
}) {
  const { orderNumber } = await params;
  const t = await getTranslations("Orders");
  return { title: t("detailMeta", { order: orderNumber }) };
}

export default async function OrderTrackingDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ orderNumber: string }>;
  searchParams: Promise<{ email?: string }>;
}) {
  const { orderNumber } = await params;
  const sp = await searchParams;
  const t = await getTranslations("Orders");
  const locale = (await getLocale()) as AppLocale;

  const order = await getOrderForViewer(decodeURIComponent(orderNumber), {
    email: sp.email,
  });

  if (!order) notFound();

  const statusKeys = [
    "new",
    "awaiting_payment",
    "accepted",
    "preparing",
    "shipped",
    "delivered",
    "cancelled",
    "returned",
  ] as const;
  const statusLabels = Object.fromEntries(
    statusKeys.map((key) => [key, t(`status.${key}`)]),
  );
  const paymentLabels = {
    pending: t("payment.pending"),
    paid: t("payment.paid"),
    failed: t("payment.failed"),
    refunded: t("payment.refunded"),
  };

  return (
    <section className="container-bv py-6 sm:py-10">
      <OrderDetailView
        order={order}
        variant="detail"
        formatMoney={(amount, currency) => formatMoney(amount, locale, currency)}
        formatDate={(value) =>
          formatDateLocale(value, locale, {
            dateStyle: "medium",
            timeStyle: "short",
          })
        }
        labels={{
          orderNumber: t("orderNumber"),
          placedAt: t("placedAt"),
          status: t("statusLabel"),
          payment: t("paymentLabel"),
          items: t("items"),
          qty: t("qty"),
          shipping: t("shipping"),
          subtotal: t("subtotal"),
          discount: t("discount"),
          shippingFee: t("shippingFee"),
          total: t("total"),
          note: t("note"),
          tracking: t("tracking"),
          carrier: t("carrier"),
          continueShopping: t("continueShopping"),
          trackOrders: t("trackOrders"),
          backToAccount: t("backToAccount"),
          statusLabels,
          paymentLabels,
          historyTitle: t("historyTitle"),
        }}
      />
    </section>
  );
}
