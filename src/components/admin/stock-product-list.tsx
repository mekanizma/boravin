"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Pencil } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { useToast } from "@/components/ui/toast";
import { adjustStock } from "@/features/stock/actions";
import { cn } from "@/lib/utils";

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
  if (stock <= 0) return { label: "Tükendi", tone: "danger" as const, pct: 0 };
  if (stock <= minStock) {
    const pct = Math.max(
      8,
      Math.round((stock / Math.max(minStock * 2, 1)) * 100),
    );
    return { label: "Düşük", tone: "warning" as const, pct: Math.min(pct, 45) };
  }
  const pct = Math.min(
    100,
    Math.round((stock / Math.max(minStock * 4, stock)) * 100),
  );
  return { label: "Yeterli", tone: "success" as const, pct: Math.max(55, pct) };
}

function meterColor(tone: "success" | "warning" | "danger") {
  if (tone === "danger") return "bg-[var(--bv-danger)]";
  if (tone === "warning") return "bg-[var(--bv-warning)]";
  return "bg-[var(--bv-success)]";
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
  const [expanded, setExpanded] = React.useState<string | null>(null);

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
      <div className="flex h-full min-h-[12rem] items-center justify-center px-4 py-8 text-center text-sm text-[var(--bv-muted)]">
        Bu filtrede ürün yok.
      </div>
    );
  }

  return (
    <>
      <ul className="divide-y divide-[var(--bv-border)]">
        {products.map((product) => {
          const state = level(product.stock, product.minStock);
          const isOpen = expanded === product.id;
          return (
            <li key={product.id} className="bg-white">
              <div className="flex items-center gap-2 px-3 py-2.5 sm:gap-3 sm:px-4">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                    <Link
                      href={`/admin/products/${product.id}`}
                      className="truncate text-sm font-medium hover:underline"
                    >
                      {product.name}
                    </Link>
                    <Badge tone={state.tone} className="shrink-0">
                      {state.label}
                    </Badge>
                  </div>
                  <div className="mt-1 flex items-center gap-2">
                    <span className="truncate font-mono text-[11px] text-[var(--bv-muted)]">
                      {product.sku}
                    </span>
                    <div className="hidden h-1 w-16 overflow-hidden bg-[var(--bv-concrete)] sm:block">
                      <div
                        className={cn("h-full", meterColor(state.tone))}
                        style={{ width: `${state.pct}%` }}
                      />
                    </div>
                  </div>
                </div>

                <div className="shrink-0 text-right">
                  <p className="font-display text-lg font-semibold tabular-nums leading-none sm:text-xl">
                    {product.stock}
                  </p>
                  <p className="mt-0.5 text-[10px] text-[var(--bv-muted)]">
                    min {product.minStock}
                  </p>
                </div>

                <div className="flex shrink-0 items-center gap-1">
                  <Button
                    type="button"
                    variant="accent"
                    size="sm"
                    className="h-8 px-2.5 text-xs"
                    onClick={() => {
                      setError(null);
                      setSelected(product);
                    }}
                  >
                    Güncelle
                  </Button>
                  <Link
                    href={`/admin/products/${product.id}`}
                    className="hidden sm:block"
                  >
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 px-0"
                      aria-label={`${product.name} düzenle`}
                    >
                      <Pencil className="h-3.5 w-3.5" strokeWidth={1.75} />
                    </Button>
                  </Link>
                </div>
              </div>

              {product.variants.length ? (
                <div className="border-t border-[var(--bv-border)] bg-[var(--bv-fog)]/40 px-3 py-1.5 sm:px-4">
                  <button
                    type="button"
                    className="text-[11px] font-medium text-[var(--bv-slate)] hover:text-[var(--bv-ink)]"
                    onClick={() =>
                      setExpanded(isOpen ? null : product.id)
                    }
                  >
                    {isOpen
                      ? "Varyantları gizle"
                      : `${product.variants.length} varyant`}
                  </button>
                  {isOpen ? (
                    <ul className="mt-1.5 space-y-1 pb-1 text-xs text-[var(--bv-slate)]">
                      {product.variants.map((variant) => (
                        <li
                          key={variant.id}
                          className="flex items-center justify-between gap-3"
                        >
                          <span className="min-w-0 truncate">
                            {variant.name}
                            <span className="ml-1.5 font-mono text-[10px] text-[var(--bv-muted)]">
                              {variant.sku}
                            </span>
                          </span>
                          <span className="shrink-0 tabular-nums font-medium">
                            {variant.stock}
                          </span>
                        </li>
                      ))}
                    </ul>
                  ) : null}
                </div>
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
              <span className="font-semibold tabular-nums text-[var(--bv-ink)]">
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
            <Button
              type="submit"
              variant="accent"
              className="w-full"
              disabled={pending}
            >
              {pending ? "Kaydediliyor…" : "Hareketi kaydet"}
            </Button>
          </form>
        ) : null}
      </Modal>
    </>
  );
}
