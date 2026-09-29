"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { useToast } from "@/components/ui/toast";
import { adjustStock } from "@/features/stock/actions";

export type StockVariant = {
  id: string;
  name: string;
  sku: string;
  stock: number;
};

export type StockProduct = {
  id: string;
  name: string;
  sku: string;
  stock: number;
  minStock: number;
  variants: StockVariant[];
};

function level(stock: number, minStock: number) {
  if (stock <= 0) return { label: "Tükendi", tone: "danger" as const };
  if (stock <= minStock) return { label: "Düşük", tone: "warning" as const };
  return { label: "Yeterli", tone: "success" as const };
}

function errorText(code: string) {
  if (code === "INSUFFICIENT_STOCK") {
    return "Çıkış miktarı mevcut stoktan fazla.";
  }
  if (code === "INVALID_QUANTITY") {
    return "Geçerli bir miktar girin.";
  }
  return "Stok güncellenemedi.";
}

export function StockProductList({ products }: { products: StockProduct[] }) {
  const router = useRouter();
  const { toast } = useToast();
  const [selected, setSelected] = React.useState<StockProduct | null>(null);
  const [pending, setPending] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!selected) return;
    const form = new FormData(e.currentTarget);
    const target = String(form.get("target") ?? "product");
    setPending(true);
    setError(null);
  try {
    const result = await adjustStock({
      productId: selected.id,
      variantId: target === "product" ? null : target,
      mode: String(form.get("mode")) as "in" | "out" | "set",
      quantity: Number(form.get("quantity")),
      note: String(form.get("note") ?? ""),
      minStock: Number(form.get("minStock")),
    });
    if (!result.ok) {
      setError(errorText(result.error));
      return;
    }
    toast({
      tone: "success",
      title: "Stok güncellendi",
      description: `${selected.name}: ${result.stockAfter} adet`,
    });
    setSelected(null);
    router.refresh();
  } catch {
    setError("Stok güncellenemedi.");
  } finally {
    setPending(false);
  }
  }

  if (!products.length) {
    return (
      <div className="rounded-[var(--radius-lg)] border border-dashed border-[var(--bv-border-strong)] p-10 text-center text-sm text-[var(--bv-muted)]">
        Bu filtrede ürün yok.
      </div>
    );
  }

  return (
    <>
      <ul className="grid gap-3">
        {products.map((product) => {
          const state = level(product.stock, product.minStock);
          return (
            <li
              key={product.id}
              className="border border-[var(--bv-border)] bg-white p-4"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate font-medium">{product.name}</p>
                  <p className="mt-0.5 text-xs text-[var(--bv-muted)]">
                    {product.sku}
                  </p>
                </div>
                <Badge tone={state.tone}>{state.label}</Badge>
              </div>
              <div className="mt-4 flex items-end justify-between gap-3">
                <div>
                  <p className="font-display text-3xl font-semibold tracking-tight">
                    {product.stock}
                  </p>
                  <p className="text-xs text-[var(--bv-muted)]">
                    Alt limit {product.minStock}
                  </p>
                </div>
                <Button
                  type="button"
                  variant="accent"
                  onClick={() => {
                    setError(null);
                    setSelected(product);
                  }}
                >
                  Stok güncelle
                </Button>
              </div>
              {product.variants.length ? (
                <ul className="mt-3 space-y-1 border-t border-[var(--bv-border)] pt-3 text-sm text-[var(--bv-slate)]">
                  {product.variants.map((variant) => (
                    <li
                      key={variant.id}
                      className="flex items-center justify-between gap-3"
                    >
                      <span className="min-w-0 truncate">
                        {variant.name}
                        <span className="ml-2 text-xs text-[var(--bv-muted)]">
                          {variant.sku}
                        </span>
                      </span>
                      <span className="shrink-0 font-medium">{variant.stock}</span>
                    </li>
                  ))}
                </ul>
              ) : null}
            </li>
          );
        })}
      </ul>

      <Modal
        open={Boolean(selected)}
        onClose={() => setSelected(null)}
        title={selected ? selected.name : "Stok"}
      >
        {selected ? (
          <form onSubmit={onSubmit} className="space-y-4">
            <p className="text-sm text-[var(--bv-muted)]">
              Mevcut ana stok:{" "}
              <span className="font-semibold text-[var(--bv-ink)]">
                {selected.stock}
              </span>
            </p>
            <label className="flex flex-col gap-1.5 text-sm font-medium">
              Hedef
              <select
                name="target"
                defaultValue="product"
                className="h-10 rounded-[var(--radius-md)] border border-[var(--bv-border-strong)] bg-white px-3 text-sm font-normal"
              >
                <option value="product">Ana stok · {selected.sku}</option>
                {selected.variants.map((variant) => (
                  <option key={variant.id} value={variant.id}>
                    {variant.name} · {variant.stock} adet
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1.5 text-sm font-medium">
              İşlem
              <select
                name="mode"
                defaultValue="in"
                className="h-10 rounded-[var(--radius-md)] border border-[var(--bv-border-strong)] bg-white px-3 text-sm font-normal"
              >
                <option value="in">Giriş</option>
                <option value="out">Çıkış</option>
                <option value="set">Sayım (yeni miktar)</option>
              </select>
            </label>
            <Input
              label="Miktar"
              name="quantity"
              type="number"
              min={0}
              required
              inputMode="numeric"
            />
            <Input
              label="Alt limit"
              name="minStock"
              type="number"
              min={0}
              defaultValue={selected.minStock}
              inputMode="numeric"
              hint="Bu sayının altına düşünce düşük stok olarak işaretlenir."
            />
            <Input label="Not" name="note" placeholder="İrsaliye, sayım, fire…" />
            {error ? (
              <p className="text-sm text-[var(--bv-danger)]" role="alert">
                {error}
              </p>
            ) : null}
            <Button type="submit" variant="accent" className="w-full" disabled={pending}>
              {pending ? "Kaydediliyor…" : "Hareketi kaydet"}
            </Button>
          </form>
        ) : null}
      </Modal>
    </>
  );
}
