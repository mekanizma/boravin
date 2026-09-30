import Link from "next/link";
import type { StorefrontOrder } from "@/lib/storefront/orders";
import { OrderStatusSteps } from "@/components/storefront/order-status-steps";

type Labels = {
  orderNumber: string;
  placedAt: string;
  status: string;
  payment: string;
  items: string;
  qty: string;
  shipping: string;
  subtotal: string;
  discount: string;
  shippingFee: string;
  total: string;
  note: string;
  tracking: string;
  carrier: string;
  continueShopping: string;
  trackOrders: string;
  backToAccount: string;
  statusLabels: Record<string, string>;
  paymentLabels: Record<string, string>;
  historyTitle: string;
};

function money(amount: string, currency: string, format: (n: string, c: string) => string) {
  return format(amount, currency);
}

export function OrderDetailView({
  order,
  labels,
  formatMoney,
  formatDate,
  variant = "detail",
}: {
  order: StorefrontOrder;
  labels: Labels;
  formatMoney: (amount: string, currency: string) => string;
  formatDate: (value: Date) => string;
  variant?: "confirmation" | "detail";
}) {
  const address = order.shippingAddress;
  const addressLine = address
    ? [
        address.fullName,
        address.phone,
        address.line1,
        [address.district, address.city].filter(Boolean).join(" / "),
        address.postalCode,
      ]
        .filter(Boolean)
        .join(" · ")
    : null;

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-4 sm:gap-5">
      <div className="border border-[#e3e8ec] bg-white p-4 sm:p-6">
        {variant === "confirmation" ? (
          <p className="text-[11px] font-semibold tracking-[0.16em] text-[var(--bv-teal)] uppercase">
            {labels.status}
          </p>
        ) : null}
        <h1 className="mt-1 font-display text-2xl font-semibold tracking-tight text-[#111] sm:text-3xl">
          {labels.orderNumber}: {order.orderNumber}
        </h1>
        <p className="mt-2 text-sm text-[#6b7280]">
          {labels.placedAt}: {formatDate(order.createdAt)}
        </p>
        <div className="mt-4 flex flex-wrap gap-2 text-xs font-semibold">
          <span className="rounded-full bg-[#f3fbf9] px-3 py-1 text-[var(--bv-teal)]">
            {labels.statusLabels[order.status] ?? order.status}
          </span>
          <span className="rounded-full bg-[#f4f6f8] px-3 py-1 text-[#444]">
            {labels.payment}:{" "}
            {labels.paymentLabels[order.paymentStatus] ?? order.paymentStatus}
          </span>
        </div>
        <div className="mt-5">
          <OrderStatusSteps status={order.status} labels={labels.statusLabels} />
        </div>
      </div>

      <div className="border border-[#e3e8ec] bg-white p-4 sm:p-6">
        <h2 className="text-sm font-semibold tracking-wide text-[#111] uppercase">
          {labels.items}
        </h2>
        <ul className="mt-3 divide-y divide-[#eef1f3]">
          {order.items.map((item) => (
            <li
              key={item.id}
              className="flex flex-col gap-1 py-3 sm:flex-row sm:items-start sm:justify-between"
            >
              <div className="min-w-0">
                <p className="text-sm font-semibold text-[#111]">{item.productName}</p>
                {item.variantName ? (
                  <p className="text-xs text-[#6b7280]">{item.variantName}</p>
                ) : null}
                <p className="mt-1 text-xs text-[#6b7280]">
                  {labels.qty}: {item.quantity} ·{" "}
                  {money(item.unitPrice, order.currency, formatMoney)}
                </p>
              </div>
              <p className="shrink-0 text-sm font-semibold text-[#111]">
                {money(item.total, order.currency, formatMoney)}
              </p>
            </li>
          ))}
        </ul>
        <dl className="mt-4 space-y-1.5 border-t border-[#eef1f3] pt-4 text-sm">
          <div className="flex justify-between gap-3">
            <dt className="text-[#6b7280]">{labels.subtotal}</dt>
            <dd className="font-medium">
              {money(order.subtotal, order.currency, formatMoney)}
            </dd>
          </div>
          {Number(order.discountTotal) > 0 ? (
            <div className="flex justify-between gap-3">
              <dt className="text-[#6b7280]">{labels.discount}</dt>
              <dd className="font-medium text-[var(--bv-sale)]">
                −{money(order.discountTotal, order.currency, formatMoney)}
              </dd>
            </div>
          ) : null}
          <div className="flex justify-between gap-3">
            <dt className="text-[#6b7280]">{labels.shippingFee}</dt>
            <dd className="font-medium">
              {money(order.shippingTotal, order.currency, formatMoney)}
            </dd>
          </div>
          <div className="flex justify-between gap-3 border-t border-[#eef1f3] pt-2 text-base font-semibold">
            <dt>{labels.total}</dt>
            <dd>{money(order.grandTotal, order.currency, formatMoney)}</dd>
          </div>
        </dl>
      </div>

      {addressLine ? (
        <div className="border border-[#e3e8ec] bg-white p-4 sm:p-6">
          <h2 className="text-sm font-semibold tracking-wide text-[#111] uppercase">
            {labels.shipping}
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-[#333]">{addressLine}</p>
          {order.trackingNumber ? (
            <p className="mt-3 text-sm text-[#111]">
              <span className="font-semibold">{labels.tracking}:</span>{" "}
              {order.trackingNumber}
              {order.shippingCarrier
                ? ` (${labels.carrier}: ${order.shippingCarrier})`
                : null}
            </p>
          ) : null}
          {order.customerNote ? (
            <p className="mt-3 text-sm text-[#6b7280]">
              <span className="font-semibold text-[#111]">{labels.note}:</span>{" "}
              {order.customerNote}
            </p>
          ) : null}
        </div>
      ) : null}

      {order.history.length > 0 ? (
        <div className="border border-[#e3e8ec] bg-white p-4 sm:p-6">
          <h2 className="text-sm font-semibold tracking-wide text-[#111] uppercase">
            {labels.historyTitle}
          </h2>
          <ol className="mt-3 space-y-3">
            {order.history.map((row) => (
              <li
                key={row.id}
                className="relative border-l-2 border-[#e6eaee] pl-4"
              >
                <span className="absolute top-1.5 -left-[5px] h-2.5 w-2.5 rounded-full bg-[var(--bv-teal)]" />
                <p className="text-sm font-medium text-[#111]">
                  {labels.statusLabels[row.toStatus] ?? row.toStatus}
                </p>
                {row.note ? (
                  <p className="mt-0.5 text-xs text-[#6b7280]">{row.note}</p>
                ) : null}
                <p className="mt-1 text-[11px] text-[#98a1aa]">
                  {formatDate(row.createdAt)}
                </p>
              </li>
            ))}
          </ol>
        </div>
      ) : null}

      <div className="grid gap-2 sm:grid-cols-3">
        <Link
          href="/urunler"
          className="inline-flex h-12 items-center justify-center bg-[var(--bv-teal)] text-sm font-semibold text-white"
        >
          {labels.continueShopping}
        </Link>
        <Link
          href="/siparis-takip"
          className="inline-flex h-12 items-center justify-center border border-[#d7dee3] bg-white text-sm font-semibold text-[#111]"
        >
          {labels.trackOrders}
        </Link>
        <Link
          href="/hesabim"
          className="inline-flex h-12 items-center justify-center border border-[#d7dee3] bg-white text-sm font-semibold text-[#111]"
        >
          {labels.backToAccount}
        </Link>
      </div>
    </div>
  );
}
