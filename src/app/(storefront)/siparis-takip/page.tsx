import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";
import { OrderLookupForm } from "@/components/storefront/order-lookup-form";
import { getCurrentCustomer } from "@/lib/account/session";
import { formatMoney, formatDateLocale } from "@/lib/i18n/format";
import type { AppLocale } from "@/i18n/config";
import { listCustomerOrders } from "@/lib/storefront/orders";

export async function generateMetadata() {
  const t = await getTranslations("Orders");
  return { title: t("trackingMeta") };
}

export default async function OrderTrackingPage() {
  const t = await getTranslations("Orders");
  const locale = (await getLocale()) as AppLocale;
  const customer = await getCurrentCustomer();
  const orders = customer ? await listCustomerOrders() : [];

  return (
    <section className="container-bv py-6 sm:py-10">
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-4 sm:gap-5">
        <div>
          <p className="text-[11px] font-semibold tracking-[0.16em] text-[#6b7280] uppercase">
            {t("trackingEyebrow")}
          </p>
          <h1 className="mt-1 font-display text-3xl font-semibold tracking-tight text-[#111]">
            {t("trackingTitle")}
          </h1>
          <p className="mt-2 text-sm text-[#6b7280]">{t("trackingBody")}</p>
        </div>

        <OrderLookupForm
          labels={{
            title: t("lookupTitle"),
            hint: t("lookupHint"),
            orderNumber: t("orderNumber"),
            email: t("email"),
            submit: t("lookupSubmit"),
            orderPlaceholder: t("orderPlaceholder"),
            emailPlaceholder: t("emailPlaceholder"),
          }}
        />

        {customer ? (
          <div className="border border-[#e3e8ec] bg-white p-4 sm:p-6">
            <h2 className="font-display text-xl font-semibold tracking-tight text-[#111]">
              {t("myOrdersTitle")}
            </h2>
            {orders.length === 0 ? (
              <p className="mt-3 text-sm text-[#6b7280]">{t("noOrders")}</p>
            ) : (
              <ul className="mt-4 divide-y divide-[#eef1f3]">
                {orders.map((order) => (
                  <li key={order.id} className="py-3.5 first:pt-0 last:pb-0">
                    <Link
                      href={`/siparis-takip/${encodeURIComponent(order.orderNumber)}`}
                      className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-[#111]">
                          {order.orderNumber}
                        </p>
                        <p className="mt-0.5 text-xs text-[#6b7280]">
                          {formatDateLocale(order.createdAt, locale, {
                            dateStyle: "medium",
                            timeStyle: "short",
                          })}{" "}
                          · {order.items.length} {t("itemCount")}
                        </p>
                      </div>
                      <div className="flex flex-wrap items-center gap-2 sm:justify-end">
                        <span className="rounded-full bg-[#f3fbf9] px-2.5 py-1 text-[11px] font-semibold text-[var(--bv-teal)]">
                          {t(`status.${order.status}` as "status.preparing")}
                        </span>
                        <span className="text-sm font-semibold text-[#111]">
                          {formatMoney(order.grandTotal, locale, order.currency)}
                        </span>
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>
        ) : (
          <p className="text-sm text-[#6b7280]">
            {t("loginHint")}{" "}
            <Link href="/hesabim" className="font-semibold text-[var(--bv-teal)]">
              {t("loginLink")}
            </Link>
          </p>
        )}
      </div>
    </section>
  );
}
