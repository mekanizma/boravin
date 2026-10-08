"use client";

import * as React from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  CreditCard,
  Lock,
  MapPin,
  ShieldCheck,
  ShoppingBag,
  UserRound,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { getCheckoutBundle, placeOrder } from "@/features/cart/actions";
import { useToast } from "@/components/ui/toast";
import { useTranslations } from "next-intl";
import { useFormatMoney } from "@/lib/i18n/format";

type CheckoutItem = {
  id: string;
  name: string;
  quantity: number;
  unitPrice: number;
  imageUrl?: string | null;
  href: string;
};

type CheckoutTotals = {
  subtotal: number;
  discount: number;
  customerDiscount: number;
  customerDiscountPercent: number;
  couponDiscount: number;
  shipping: number;
  grandTotal: number;
};

type AccountInfo = {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  phone: string | null;
  fullName: string;
};

type SavedAddress = {
  id: string;
  title: string | null;
  fullName: string;
  phone: string | null;
  line1: string;
  line2: string | null;
  city: string;
  district: string | null;
  postalCode: string | null;
  country: string;
};

function SectionCard({
  icon,
  title,
  subtitle,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="border border-[var(--bv-border)] bg-white">
      <div className="flex items-start gap-3 border-b border-[var(--bv-border)] px-4 py-4 sm:px-5">
        <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center bg-[var(--bv-fog)] text-[var(--bv-ink)]">
          {icon}
        </span>
        <div className="min-w-0">
          <h2 className="font-display text-base font-semibold tracking-tight text-[var(--bv-ink)] sm:text-lg">
            {title}
          </h2>
          {subtitle ? (
            <p className="mt-0.5 text-[12px] text-[var(--bv-muted)]">{subtitle}</p>
          ) : null}
        </div>
      </div>
      <div className="space-y-4 px-4 py-5 sm:px-5">{children}</div>
    </section>
  );
}

function NoteField({ t }: { t: ReturnType<typeof useTranslations<"Checkout">> }) {
  return (
    <div className="flex w-full flex-col gap-1.5">
      <label
        htmlFor="note"
        className="text-sm font-medium text-[var(--bv-ink)]"
      >
        {t("note")}
        <span className="ml-1 font-normal text-[var(--bv-muted)]">
          {t("noteOptional")}
        </span>
      </label>
      <textarea
        id="note"
        name="note"
        rows={3}
        placeholder={t("notePlaceholder")}
        className="w-full resize-y border border-[var(--bv-border-strong)] bg-white px-3 py-2.5 text-sm text-[var(--bv-ink)] placeholder:text-[var(--bv-muted)] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]"
      />
    </div>
  );
}

export default function CheckoutPage() {
  const t = useTranslations("Checkout");
  const tCommon = useTranslations("Common");
  const formatMoney = useFormatMoney();
  const router = useRouter();
  const { toast } = useToast();
  const [loading, setLoading] = React.useState(false);
  const [bootstrapping, setBootstrapping] = React.useState(true);
  const [items, setItems] = React.useState<CheckoutItem[]>([]);
  const [totals, setTotals] = React.useState<CheckoutTotals>({
    subtotal: 0,
    discount: 0,
    customerDiscount: 0,
    customerDiscountPercent: 0,
    couponDiscount: 0,
    shipping: 0,
    grandTotal: 0,
  });
  const [account, setAccount] = React.useState<AccountInfo | null>(null);
  const [defaultAddress, setDefaultAddress] =
    React.useState<SavedAddress | null>(null);
  const [loadError, setLoadError] = React.useState(false);

  React.useEffect(() => {
    let alive = true;
    setLoadError(false);
    getCheckoutBundle()
      .then((bundle) => {
        if (!alive) return;
        setItems(
          (bundle.items ?? []).map((item) => ({
            id: item.id,
            name: item.product?.name ?? tCommon("productFallback"),
            quantity: item.quantity,
            unitPrice: Number(item.unitPrice),
            imageUrl: item.product?.images?.[0]?.url ?? null,
            href: item.product ? `/urun/${item.product.slug}` : "/sepet",
          })),
        );
        setTotals({
          subtotal: Number(bundle.totals.subtotal),
          discount: Number(bundle.totals.discount),
          customerDiscount: Number(bundle.totals.customerDiscount ?? 0),
          customerDiscountPercent: Number(
            bundle.totals.customerDiscountPercent ?? 0,
          ),
          couponDiscount: Number(bundle.totals.couponDiscount ?? 0),
          shipping: Number(bundle.totals.shipping),
          grandTotal: Number(bundle.totals.grandTotal),
        });
        setAccount(bundle.account ?? null);
        setDefaultAddress(bundle.defaultAddress ?? null);
      })
      .catch(() => {
        if (!alive) return;
        setLoadError(true);
        setItems([]);
      })
      .finally(() => {
        if (alive) setBootstrapping(false);
      });
    return () => {
      alive = false;
    };
  }, [tCommon]);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    setLoading(true);
    try {
      const result = await placeOrder({
        email: account?.email ?? String(form.get("email") || ""),
        fullName: account?.fullName || String(form.get("fullName") || ""),
        phone: account?.phone || String(form.get("phone") || ""),
        line1: defaultAddress
          ? defaultAddress.line1
          : String(form.get("line1") || ""),
        city: defaultAddress
          ? defaultAddress.city
          : String(form.get("city") || ""),
        district: defaultAddress
          ? defaultAddress.district ?? ""
          : String(form.get("district") || ""),
        postalCode: defaultAddress
          ? defaultAddress.postalCode ?? ""
          : String(form.get("postalCode") || ""),
        country: "CY",
        paymentMethod: "mock_card",
        customerNote: String(form.get("note") || ""),
        addressId: defaultAddress?.id,
        saveAddress: account && !defaultAddress
          ? form.get("saveAddress") === "on"
          : undefined,
      });
      if (!result.ok) {
        toast({
          tone: "error",
          title: t("toastPaymentFailedTitle"),
          description: t("toastPaymentFailedDesc"),
        });
        return;
      }
      toast({
        tone: "success",
        title: t("toastSuccessTitle"),
        description: t("toastSuccessDesc", { orderNumber: result.orderNumber }),
      });
      window.dispatchEvent(new Event("bv-cart-changed"));
      router.push(`/siparis-onay/${encodeURIComponent(result.orderNumber)}`);
    } catch {
      toast({
        tone: "error",
        title: t("toastErrorTitle"),
        description: t("toastErrorDesc"),
      });
    } finally {
      setLoading(false);
    }
  }

  if (!bootstrapping && loadError) {
    return (
      <div className="container-bv py-16 text-center sm:py-24">
        <h1 className="font-display text-3xl font-semibold tracking-tight">
          {t("loadErrorTitle")}
        </h1>
        <p className="mt-2 text-sm text-[var(--bv-muted)]">{t("loadErrorBody")}</p>
        <button
          type="button"
          className="mt-6 inline-flex h-12 items-center justify-center bg-[var(--bv-teal)] px-5 text-sm font-semibold text-white"
          onClick={() => window.location.reload()}
        >
          {t("loadErrorRetry")}
        </button>
      </div>
    );
  }

  if (!bootstrapping && items.length === 0) {
    return (
      <div className="container-bv py-16 text-center sm:py-24">
        <span className="mx-auto inline-flex h-14 w-14 items-center justify-center bg-white text-[var(--bv-muted)] shadow-[0_8px_24px_rgba(18,20,23,0.06)]">
          <ShoppingBag className="h-6 w-6" strokeWidth={1.5} />
        </span>
        <h1 className="mt-5 font-display text-3xl font-semibold tracking-tight">
          {t("emptyTitle")}
        </h1>
        <p className="mt-2 text-sm text-[var(--bv-muted)]">{t("emptyBody")}</p>
        <Link
          href="/urunler"
          className="mt-6 inline-flex h-11 items-center justify-center bg-[var(--bv-sale)] px-5 text-sm font-semibold text-white hover:bg-[var(--bv-sale-hover)]"
        >
          {t("browseProducts")}
        </Link>
      </div>
    );
  }

  const itemCount = items.reduce((sum, item) => sum + item.quantity, 0);
  const isMember = Boolean(account);
  const hasSavedAddress = Boolean(defaultAddress);

  return (
    <div className="container-bv py-8 sm:py-12">
      <nav className="mb-6 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-[var(--bv-muted)]">
        <Link href="/sepet" className="hover:text-[var(--bv-ink)]">
          {t("breadcrumbCart")}
        </Link>
        <span aria-hidden>/</span>
        <span className="font-semibold text-[var(--bv-ink)]">{t("breadcrumbPay")}</span>
      </nav>

      <div className="mb-8 flex flex-wrap items-end justify-between gap-4 border-b border-[var(--bv-border)] pb-5">
        <div>
          <p className="text-[11px] font-semibold tracking-[0.18em] text-[var(--bv-muted)] uppercase">
            {t("secureEyebrow")}
          </p>
          <h1 className="mt-1 font-display text-3xl font-semibold tracking-tight sm:text-4xl">
            {t("title")}
          </h1>
          <p className="mt-2 max-w-xl text-sm text-[var(--bv-slate)]">
            {isMember ? t("introMember") : t("intro")}
          </p>
        </div>
        <div className="inline-flex items-center gap-2 bg-white px-3 py-2 text-[12px] font-medium text-[var(--bv-slate)]">
          <Lock className="h-3.5 w-3.5 text-[var(--bv-sale)]" strokeWidth={2} />
          {t("sslBadge")}
        </div>
      </div>

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_22rem] lg:gap-10 xl:grid-cols-[minmax(0,1fr)_24rem]">
        <form id="checkout-form" onSubmit={onSubmit} className="space-y-4">
          <SectionCard
            icon={<UserRound className="h-4 w-4" strokeWidth={1.75} />}
            title={t("contactTitle")}
            subtitle={
              isMember ? t("contactSubtitleMember") : t("contactSubtitle")
            }
          >
            {isMember && account ? (
              <div className="space-y-2 text-sm text-[var(--bv-ink)]">
                <p className="font-semibold">{account.fullName || "—"}</p>
                <p className="break-all text-[var(--bv-slate)]">{account.email}</p>
                {account.phone ? (
                  <p className="text-[var(--bv-slate)]">{account.phone}</p>
                ) : null}
                <p className="pt-1 text-[12px] text-[var(--bv-muted)]">
                  {t("memberContactHint")}{" "}
                  <Link
                    href="/hesabim"
                    className="font-semibold text-[var(--bv-sale)] underline-offset-2 hover:underline"
                  >
                    {t("manageProfile")}
                  </Link>
                </p>
              </div>
            ) : (
              <>
                <Input
                  label={t("email")}
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  placeholder={t("emailPlaceholder")}
                />
                <div className="grid gap-4 sm:grid-cols-2">
                  <Input
                    label={t("fullName")}
                    name="fullName"
                    autoComplete="name"
                    required
                    placeholder={t("fullNamePlaceholder")}
                  />
                  <Input
                    label={t("phone")}
                    name="phone"
                    type="tel"
                    autoComplete="tel"
                    required
                    placeholder={t("phonePlaceholder")}
                  />
                </div>
              </>
            )}
          </SectionCard>

          <SectionCard
            icon={<MapPin className="h-4 w-4" strokeWidth={1.75} />}
            title={t("addressTitle")}
            subtitle={
              hasSavedAddress
                ? t("savedAddressSubtitle")
                : isMember
                  ? t("addressNeededSubtitle")
                  : t("addressSubtitle")
            }
          >
            {hasSavedAddress && defaultAddress ? (
              <div className="space-y-1 text-sm text-[var(--bv-ink)]">
                {defaultAddress.title ? (
                  <p className="text-[11px] font-semibold tracking-wide text-[var(--bv-muted)] uppercase">
                    {defaultAddress.title}
                  </p>
                ) : null}
                <p className="font-semibold">{defaultAddress.fullName}</p>
                {defaultAddress.phone ? (
                  <p className="text-[var(--bv-slate)]">{defaultAddress.phone}</p>
                ) : null}
                <p className="text-[var(--bv-slate)]">{defaultAddress.line1}</p>
                <p className="text-[var(--bv-slate)]">
                  {[defaultAddress.district, defaultAddress.city, defaultAddress.postalCode]
                    .filter(Boolean)
                    .join(", ")}
                </p>
                <p className="pt-2 text-[12px] text-[var(--bv-muted)]">
                  <Link
                    href="/hesabim"
                    className="font-semibold text-[var(--bv-sale)] underline-offset-2 hover:underline"
                  >
                    {t("manageProfile")}
                  </Link>
                </p>
                <NoteField t={t} />
              </div>
            ) : (
              <>
                <Input
                  label={t("address")}
                  name="line1"
                  autoComplete="street-address"
                  required
                  placeholder={t("addressPlaceholder")}
                />
                <div className="grid gap-4 sm:grid-cols-2">
                  <Input
                    label={t("city")}
                    name="city"
                    autoComplete="address-level1"
                    required
                    placeholder={t("cityPlaceholder")}
                  />
                  <Input
                    label={t("district")}
                    name="district"
                    autoComplete="address-level2"
                    placeholder={t("districtPlaceholder")}
                  />
                </div>
                <Input
                  label={t("postalCode")}
                  name="postalCode"
                  autoComplete="postal-code"
                  placeholder="99010"
                />
                {isMember ? (
                  <label className="flex items-center gap-2 text-sm text-[var(--bv-ink)]">
                    <input
                      type="checkbox"
                      name="saveAddress"
                      defaultChecked
                      className="accent-[var(--bv-sale)]"
                    />
                    {t("saveAddressToAccount")}
                  </label>
                ) : null}
                <NoteField t={t} />
              </>
            )}
          </SectionCard>

          <SectionCard
            icon={<CreditCard className="h-4 w-4" strokeWidth={1.75} />}
            title={t("paymentTitle")}
            subtitle={t("paymentSubtitle")}
          >
            <label className="flex cursor-pointer items-start gap-3 border border-[var(--bv-sale)] bg-[var(--bv-sale-soft)] p-3.5">
              <input
                type="radio"
                name="paymentMethod"
                value="mock_card"
                defaultChecked
                className="mt-1 accent-[var(--bv-sale)]"
              />
              <span className="min-w-0">
                <span className="block text-sm font-semibold text-[var(--bv-ink)]">
                  {t("cardMethod")}
                </span>
                <span className="mt-0.5 block text-[12px] text-[var(--bv-slate)]">
                  {t("cardMethodHint")}
                </span>
              </span>
            </label>
            <div className="grid gap-4 sm:grid-cols-2">
              <Input
                label={t("cardName")}
                name="cardName"
                autoComplete="cc-name"
                placeholder={t("cardNamePlaceholder")}
                disabled
                hint={t("cardNameHint")}
              />
              <Input
                label={t("cardNumber")}
                name="cardNumber"
                autoComplete="cc-number"
                placeholder="•••• •••• •••• ••••"
                disabled
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <Input
                label={t("cardExpiry")}
                name="cardExpiry"
                autoComplete="cc-exp"
                placeholder={t("cardExpiryPlaceholder")}
                disabled
              />
              <Input
                label={t("cardCvc")}
                name="cardCvc"
                autoComplete="cc-csc"
                placeholder="•••"
                disabled
              />
            </div>
            <p className="inline-flex items-center gap-2 text-[12px] text-[var(--bv-muted)]">
              <ShieldCheck className="h-3.5 w-3.5 text-[var(--bv-success)]" strokeWidth={2} />
              {t("encryptedNote")}
            </p>
          </SectionCard>

          <button
            type="submit"
            form="checkout-form"
            disabled={loading || bootstrapping || items.length === 0}
            className="flex h-12 w-full items-center justify-center bg-[var(--bv-sale)] text-sm font-bold tracking-wide text-white uppercase transition-colors hover:bg-[var(--bv-sale-hover)] disabled:cursor-not-allowed disabled:opacity-55 lg:hidden"
          >
            {loading
              ? t("processing")
              : t("completeWithTotal", { total: formatMoney(totals.grandTotal) })}
          </button>
        </form>

        <aside className="border border-[var(--bv-border)] bg-white lg:sticky lg:top-28">
          <div className="border-b border-[var(--bv-border)] px-4 py-4 sm:px-5">
            <p className="text-[10px] font-semibold tracking-[0.16em] text-[var(--bv-muted)] uppercase">
              {t("orderSummary")}
            </p>
            <h2 className="mt-1 font-display text-lg font-semibold tracking-tight">
              {bootstrapping ? t("loading") : t("productCount", { count: itemCount })}
            </h2>
          </div>

          <ul className="max-h-72 divide-y divide-[var(--bv-border)] overflow-y-auto">
            {bootstrapping
              ? Array.from({ length: 2 }).map((_, i) => (
                  <li key={i} className="flex gap-3 px-4 py-3.5 sm:px-5">
                    <div className="h-14 w-14 shrink-0 animate-pulse bg-[var(--bv-fog)]" />
                    <div className="min-w-0 flex-1 space-y-2">
                      <div className="h-3 w-3/4 animate-pulse bg-[var(--bv-fog)]" />
                      <div className="h-3 w-1/3 animate-pulse bg-[var(--bv-fog)]" />
                    </div>
                  </li>
                ))
              : items.map((item) => (
                  <li key={item.id} className="flex gap-3 px-4 py-3.5 sm:px-5">
                    <Link
                      href={item.href}
                      className="relative h-14 w-14 shrink-0 overflow-hidden bg-[var(--bv-concrete)]"
                    >
                      {item.imageUrl ? (
                        <Image
                          src={item.imageUrl}
                          alt=""
                          fill
                          sizes="56px"
                          className="object-cover"
                        />
                      ) : null}
                      <span className="absolute -top-1 -right-1 inline-flex h-5 min-w-5 items-center justify-center bg-[var(--bv-ink)] px-1 text-[10px] font-bold text-white tabular-nums">
                        {item.quantity}
                      </span>
                    </Link>
                    <div className="min-w-0 flex-1">
                      <Link
                        href={item.href}
                        className="line-clamp-2 text-[13px] leading-snug font-semibold text-[var(--bv-ink)] hover:text-[var(--bv-sale)]"
                      >
                        {item.name}
                      </Link>
                      <p className="mt-1 text-[12px] text-[var(--bv-muted)]">
                        {formatMoney(item.unitPrice)}
                      </p>
                    </div>
                    <p className="shrink-0 text-[13px] font-semibold tabular-nums">
                      {formatMoney(item.unitPrice * item.quantity)}
                    </p>
                  </li>
                ))}
          </ul>

          <div className="space-y-2.5 border-t border-[var(--bv-border)] px-4 py-4 text-sm sm:px-5">
            <div className="flex justify-between text-[var(--bv-slate)]">
              <span>{t("subtotal")}</span>
              <span className="tabular-nums">{formatMoney(totals.subtotal)}</span>
            </div>
            {totals.customerDiscount > 0 ? (
              <div className="flex justify-between gap-3 text-[var(--bv-success)]">
                <span>
                  {t("customerDiscount", {
                    percent: String(totals.customerDiscountPercent),
                  })}
                </span>
                <span className="tabular-nums">
                  −{formatMoney(totals.customerDiscount)}
                </span>
              </div>
            ) : null}
            {totals.couponDiscount > 0 ? (
              <div className="flex justify-between gap-3 text-[var(--bv-success)]">
                <span>{t("couponDiscount")}</span>
                <span className="tabular-nums">
                  −{formatMoney(totals.couponDiscount)}
                </span>
              </div>
            ) : null}
            {totals.customerDiscount <= 0 &&
            totals.couponDiscount <= 0 &&
            totals.discount > 0 ? (
              <div className="flex justify-between text-[var(--bv-success)]">
                <span>{t("discount")}</span>
                <span className="tabular-nums">−{formatMoney(totals.discount)}</span>
              </div>
            ) : null}
            <div className="flex justify-between text-[var(--bv-slate)]">
              <span>{t("shipping")}</span>
              <span className="tabular-nums">
                {totals.shipping === 0 ? t("free") : formatMoney(totals.shipping)}
              </span>
            </div>
            <div className="flex items-end justify-between border-t border-[var(--bv-border)] pt-3">
              <span className="text-[11px] font-semibold tracking-[0.12em] text-[var(--bv-muted)] uppercase">
                {t("total")}
              </span>
              <span className="font-display text-2xl font-semibold tracking-tight tabular-nums">
                {formatMoney(totals.grandTotal)}
              </span>
            </div>
          </div>

          <div className="hidden border-t border-[var(--bv-border)] px-4 py-4 sm:px-5 lg:block">
            <button
              type="submit"
              form="checkout-form"
              disabled={loading || bootstrapping || items.length === 0}
              className="flex h-12 w-full items-center justify-center bg-[var(--bv-sale)] text-sm font-bold tracking-wide text-white uppercase transition-colors hover:bg-[var(--bv-sale-hover)] disabled:cursor-not-allowed disabled:opacity-55"
            >
              {loading ? t("processing") : t("complete")}
            </button>
            <Link
              href="/sepet"
              className="mt-2 flex h-10 w-full items-center justify-center text-[13px] font-semibold text-[var(--bv-muted)] hover:text-[var(--bv-ink)]"
            >
              {t("backToCart")}
            </Link>
          </div>
        </aside>
      </div>
    </div>
  );
}
