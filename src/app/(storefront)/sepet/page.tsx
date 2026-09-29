import Link from "next/link";
import { getCheckoutBundle } from "@/features/cart/actions";
import { formatCurrency } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { CartLineControls } from "@/components/storefront/cart-line-controls";

export const metadata = { title: "Sepet" };

export default async function CartPage() {
  const { items, totals } = await getCheckoutBundle();

  if (!items.length) {
    return (
      <div className="container-bv py-16 text-center">
        <h1 className="font-display text-3xl font-bold">Sepetiniz boş</h1>
        <p className="mt-2 text-[var(--bv-muted)]">
          Beğendiğiniz ürünleri sepete ekleyerek başlayın.
        </p>
        <Link href="/urunler" className="mt-6 inline-block">
          <Button variant="accent">Ürünlere göz at</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="container-bv py-8 sm:py-12">
      <h1 className="font-display text-3xl font-bold">Sepet</h1>
      <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_20rem]">
        <ul className="space-y-4">
          {items.map((item) => (
            <li
              key={item.id}
              className="flex flex-col gap-3 border-b border-[var(--bv-border)] pb-4 sm:flex-row sm:items-center sm:justify-between"
            >
              <div>
                <p className="font-medium">{item.product?.name ?? "Ürün"}</p>
                {item.variant ? (
                  <p className="text-xs text-[var(--bv-muted)]">
                    {item.variant.name}
                  </p>
                ) : null}
                <p className="mt-1 text-sm">
                  {formatCurrency(Number(item.unitPrice))}
                </p>
              </div>
              <CartLineControls itemId={item.id} quantity={item.quantity} />
            </li>
          ))}
        </ul>
        <aside className="h-fit rounded-[var(--radius-lg)] border border-[var(--bv-border)] bg-white p-4">
          <h2 className="font-semibold">Özet</h2>
          <dl className="mt-4 space-y-2 text-sm">
            <div className="flex justify-between">
              <dt>Ara toplam</dt>
              <dd>{formatCurrency(totals.subtotal)}</dd>
            </div>
            <div className="flex justify-between">
              <dt>İndirim</dt>
              <dd>-{formatCurrency(totals.discount)}</dd>
            </div>
            <div className="flex justify-between">
              <dt>Kargo</dt>
              <dd>{formatCurrency(totals.shipping)}</dd>
            </div>
            <div className="flex justify-between border-t border-[var(--bv-border)] pt-2 text-base font-semibold">
              <dt>Toplam</dt>
              <dd>{formatCurrency(totals.grandTotal)}</dd>
            </div>
          </dl>
          <Link href="/odeme" className="mt-4 block">
            <Button variant="accent" className="w-full">
              Ödemeye geç
            </Button>
          </Link>
        </aside>
      </div>
    </div>
  );
}
