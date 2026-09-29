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
import { getCart, getCartTotals, placeOrder } from "@/features/cart/actions";
import { useToast } from "@/components/ui/toast";
import { formatCurrency } from "@/lib/utils";

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
  shipping: number;
  grandTotal: number;
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

export default function CheckoutPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [loading, setLoading] = React.useState(false);
  const [bootstrapping, setBootstrapping] = React.useState(true);
  const [items, setItems] = React.useState<CheckoutItem[]>([]);
  const [totals, setTotals] = React.useState<CheckoutTotals>({
    subtotal: 0,
    discount: 0,
    shipping: 0,
    grandTotal: 0,
  });

  React.useEffect(() => {
    let alive = true;
    Promise.all([getCart(), getCartTotals()])
      .then(([cart, nextTotals]) => {
        if (!alive) return;
        setItems(
          (cart.items ?? []).map((item) => ({
            id: item.id,
            name: item.product?.name ?? "Ürün",
            quantity: item.quantity,
            unitPrice: Number(item.unitPrice),
            imageUrl: item.product?.images?.[0]?.url ?? null,
            href: item.product ? `/urun/${item.product.slug}` : "/sepet",
          })),
        );
        setTotals({
          subtotal: Number(nextTotals.subtotal),
          discount: Number(nextTotals.discount),
          shipping: Number(nextTotals.shipping),
          grandTotal: Number(nextTotals.grandTotal),
        });
      })
      .catch(() => {})
      .finally(() => {
        if (alive) setBootstrapping(false);
      });
    return () => {
      alive = false;
    };
  }, []);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    setLoading(true);
    try {
      const result = await placeOrder({
        email: String(form.get("email")),
        fullName: String(form.get("fullName")),
        phone: String(form.get("phone")),
        line1: String(form.get("line1")),
        city: String(form.get("city")),
        district: String(form.get("district") || ""),
        postalCode: String(form.get("postalCode") || ""),
        country: "CY",
        paymentMethod: "mock_card",
        customerNote: String(form.get("note") || ""),
      });
      toast({
        tone: "success",
        title: "Sipariş alındı",
        description: `Sipariş no: ${result.orderNumber}`,
      });
      window.dispatchEvent(new Event("bv-cart-changed"));
      router.push(`/hesabim?order=${result.orderNumber}`);
    } catch {
      toast({
        tone: "error",
        title: "Sipariş oluşturulamadı",
        description: "Bir sorun oluştu. Lütfen tekrar deneyin.",
      });
    } finally {
      setLoading(false);
    }
  }

  if (!bootstrapping && items.length === 0) {
    return (
      <div className="container-bv py-16 text-center sm:py-24">
        <span className="mx-auto inline-flex h-14 w-14 items-center justify-center bg-white text-[var(--bv-muted)] shadow-[0_8px_24px_rgba(18,20,23,0.06)]">
          <ShoppingBag className="h-6 w-6" strokeWidth={1.5} />
        </span>
        <h1 className="mt-5 font-display text-3xl font-semibold tracking-tight">
          Sepetiniz boş
        </h1>
        <p className="mt-2 text-sm text-[var(--bv-muted)]">
          Ödemeye geçmeden önce sepete ürün ekleyin.
        </p>
        <Link
          href="/urunler"
          className="mt-6 inline-flex h-11 items-center justify-center bg-[var(--bv-sale)] px-5 text-sm font-semibold text-white hover:bg-[var(--bv-sale-hover)]"
        >
          Ürünlere göz at
        </Link>
      </div>
    );
  }

  const itemCount = items.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <div className="container-bv py-8 sm:py-12">
      <nav className="mb-6 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-[var(--bv-muted)]">
        <Link href="/sepet" className="hover:text-[var(--bv-ink)]">
          Sepet
        </Link>
        <span aria-hidden>/</span>
        <span className="font-semibold text-[var(--bv-ink)]">Ödeme</span>
      </nav>

      <div className="mb-8 flex flex-wrap items-end justify-between gap-4 border-b border-[var(--bv-border)] pb-5">
        <div>
          <p className="text-[11px] font-semibold tracking-[0.18em] text-[var(--bv-muted)] uppercase">
            Güvenli ödeme
          </p>
          <h1 className="mt-1 font-display text-3xl font-semibold tracking-tight sm:text-4xl">
            Siparişi tamamla
          </h1>
          <p className="mt-2 max-w-xl text-sm text-[var(--bv-slate)]">
            Misafir ödeme desteklenir. Kart bilgileri test ortamında güvenli mock
            provider ile işlenir.
          </p>
        </div>
        <div className="inline-flex items-center gap-2 bg-white px-3 py-2 text-[12px] font-medium text-[var(--bv-slate)]">
          <Lock className="h-3.5 w-3.5 text-[var(--bv-sale)]" strokeWidth={2} />
          SSL korumalı ödeme
        </div>
      </div>

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_22rem] lg:gap-10 xl:grid-cols-[minmax(0,1fr)_24rem]">
        <form id="checkout-form" onSubmit={onSubmit} className="space-y-4">
          <SectionCard
            icon={<UserRound className="h-4 w-4" strokeWidth={1.75} />}
            title="İletişim"
            subtitle="Sipariş bilgilendirmeleri bu adrese gönderilir"
          >
            <Input
              label="E-posta"
              name="email"
              type="email"
              autoComplete="email"
              required
              placeholder="ornek@mail.com"
            />
            <div className="grid gap-4 sm:grid-cols-2">
              <Input
                label="Ad Soyad"
                name="fullName"
                autoComplete="name"
                required
                placeholder="Adınız Soyadınız"
              />
              <Input
                label="Telefon"
                name="phone"
                type="tel"
                autoComplete="tel"
                required
                placeholder="05xx xxx xx xx"
              />
            </div>
          </SectionCard>

          <SectionCard
            icon={<MapPin className="h-4 w-4" strokeWidth={1.75} />}
            title="Teslimat adresi"
            subtitle="Kıbrıs içi teslimat bilgileriniz"
          >
            <Input
              label="Adres"
              name="line1"
              autoComplete="street-address"
              required
              placeholder="Mahalle, sokak, bina no"
            />
            <div className="grid gap-4 sm:grid-cols-2">
              <Input
                label="Şehir"
                name="city"
                autoComplete="address-level1"
                required
                placeholder="Lefkoşa"
              />
              <Input
                label="İlçe"
                name="district"
                autoComplete="address-level2"
                placeholder="Merkez"
              />
            </div>
            <Input
              label="Posta kodu"
              name="postalCode"
              autoComplete="postal-code"
              placeholder="99010"
            />
            <div className="flex w-full flex-col gap-1.5">
              <label
                htmlFor="note"
                className="text-sm font-medium text-[var(--bv-ink)]"
              >
                Sipariş notu
                <span className="ml-1 font-normal text-[var(--bv-muted)]">
                  (opsiyonel)
                </span>
              </label>
              <textarea
                id="note"
                name="note"
                rows={3}
                placeholder="Teslimat için özel notunuz varsa yazın"
                className="w-full resize-y border border-[var(--bv-border-strong)] bg-white px-3 py-2.5 text-sm text-[var(--bv-ink)] placeholder:text-[var(--bv-muted)] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]"
              />
            </div>
          </SectionCard>

          <SectionCard
            icon={<CreditCard className="h-4 w-4" strokeWidth={1.75} />}
            title="Ödeme yöntemi"
            subtitle="Test kartı ile güvenli mock ödeme"
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
                  Kredi / banka kartı
                </span>
                <span className="mt-0.5 block text-[12px] text-[var(--bv-slate)]">
                  Kart bilgileri gerçek tahsilat yapılmadan mock provider ile
                  doğrulanır.
                </span>
              </span>
            </label>
            <div className="grid gap-4 sm:grid-cols-2">
              <Input
                label="Kart üzerindeki isim"
                name="cardName"
                autoComplete="cc-name"
                placeholder="AD SOYAD"
                disabled
                hint="Demo — gerçek kart bilgisi gerekmez"
              />
              <Input
                label="Kart numarası"
                name="cardNumber"
                autoComplete="cc-number"
                placeholder="•••• •••• •••• ••••"
                disabled
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <Input
                label="Son kullanma"
                name="cardExpiry"
                autoComplete="cc-exp"
                placeholder="AA / YY"
                disabled
              />
              <Input
                label="CVC"
                name="cardCvc"
                autoComplete="cc-csc"
                placeholder="•••"
                disabled
              />
            </div>
            <p className="inline-flex items-center gap-2 text-[12px] text-[var(--bv-muted)]">
              <ShieldCheck className="h-3.5 w-3.5 text-[var(--bv-success)]" strokeWidth={2} />
              Ödeme bilgileriniz şifrelenmiş bağlantı üzerinden iletilir.
            </p>
          </SectionCard>

          <button
            type="submit"
            form="checkout-form"
            disabled={loading || bootstrapping || items.length === 0}
            className="flex h-12 w-full items-center justify-center bg-[var(--bv-sale)] text-sm font-bold tracking-wide text-white uppercase transition-colors hover:bg-[var(--bv-sale-hover)] disabled:cursor-not-allowed disabled:opacity-55 lg:hidden"
          >
            {loading
              ? "İşleniyor…"
              : `Siparişi tamamla · ${formatCurrency(totals.grandTotal)}`}
          </button>
        </form>

        <aside className="border border-[var(--bv-border)] bg-white lg:sticky lg:top-28">
          <div className="border-b border-[var(--bv-border)] px-4 py-4 sm:px-5">
            <p className="text-[10px] font-semibold tracking-[0.16em] text-[var(--bv-muted)] uppercase">
              Sipariş özeti
            </p>
            <h2 className="mt-1 font-display text-lg font-semibold tracking-tight">
              {bootstrapping ? "Yükleniyor…" : `${itemCount} ürün`}
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
                        {formatCurrency(item.unitPrice)}
                      </p>
                    </div>
                    <p className="shrink-0 text-[13px] font-semibold tabular-nums">
                      {formatCurrency(item.unitPrice * item.quantity)}
                    </p>
                  </li>
                ))}
          </ul>

          <div className="space-y-2.5 border-t border-[var(--bv-border)] px-4 py-4 text-sm sm:px-5">
            <div className="flex justify-between text-[var(--bv-slate)]">
              <span>Ara toplam</span>
              <span className="tabular-nums">{formatCurrency(totals.subtotal)}</span>
            </div>
            {totals.discount > 0 ? (
              <div className="flex justify-between text-[var(--bv-success)]">
                <span>İndirim</span>
                <span className="tabular-nums">
                  −{formatCurrency(totals.discount)}
                </span>
              </div>
            ) : null}
            <div className="flex justify-between text-[var(--bv-slate)]">
              <span>Kargo</span>
              <span className="tabular-nums">
                {totals.shipping === 0
                  ? "Ücretsiz"
                  : formatCurrency(totals.shipping)}
              </span>
            </div>
            <div className="flex items-end justify-between border-t border-[var(--bv-border)] pt-3">
              <span className="text-[11px] font-semibold tracking-[0.12em] text-[var(--bv-muted)] uppercase">
                Toplam
              </span>
              <span className="font-display text-2xl font-semibold tracking-tight tabular-nums">
                {formatCurrency(totals.grandTotal)}
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
              {loading ? "İşleniyor…" : "Siparişi tamamla"}
            </button>
            <Link
              href="/sepet"
              className="mt-2 flex h-10 w-full items-center justify-center text-[13px] font-semibold text-[var(--bv-muted)] hover:text-[var(--bv-ink)]"
            >
              Sepete dön
            </Link>
          </div>
        </aside>
      </div>
    </div>
  );
}
