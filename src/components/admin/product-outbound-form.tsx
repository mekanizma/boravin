"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  Building2,
  CreditCard,
  Banknote,
  Landmark,
  Plus,
  Search,
  Trash2,
  User,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";
import { cn, formatCurrency } from "@/lib/utils";
import {
  createProductOutbound,
  searchSaleCustomers,
  searchSaleProducts,
} from "@/features/sales/actions";
import {
  PAYMENT_METHODS,
  type PaymentMethodKey,
  type SaleCustomerHit,
  type SaleProductHit,
} from "@/features/sales/types";
import { computeInvoiceTotals } from "@/lib/invoices/helpers";

type CartLine = {
  key: string;
  productId: string;
  variantId: string | null;
  name: string;
  variantName: string | null;
  sku: string;
  unitPrice: number;
  taxRate: number;
  quantity: number;
  maxStock: number;
};

const fieldClass =
  "h-10 w-full rounded-[var(--radius-md)] border border-[var(--bv-border-strong)] bg-white px-3 text-sm text-[var(--bv-ink)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]";

const PAYMENT_OPTIONS: Array<{
  key: PaymentMethodKey;
  label: string;
  icon: typeof Banknote;
}> = [
  { key: "nakit", label: PAYMENT_METHODS.nakit, icon: Banknote },
  { key: "kredi_karti", label: PAYMENT_METHODS.kredi_karti, icon: CreditCard },
  { key: "havale", label: PAYMENT_METHODS.havale, icon: Landmark },
];

function errorMessage(code: string) {
  switch (code) {
    case "INSUFFICIENT_STOCK":
      return "Stok yetersiz. Miktarları kontrol edin.";
    case "TAX_REQUIRED":
      return "Firma çıkışında vergi numarası zorunlu.";
    case "PRODUCT_NOT_FOUND":
      return "Seçilen ürün bulunamadı.";
    case "VALIDATION":
      return "Formu kontrol edin.";
    default:
      return "Ürün çıkışı tamamlanamadı.";
  }
}

export function ProductOutboundForm() {
  const router = useRouter();
  const { toast } = useToast();
  const [saving, setSaving] = React.useState(false);

  const [buyerType, setBuyerType] = React.useState<"individual" | "corporate">(
    "individual",
  );
  const [documentType, setDocumentType] = React.useState<"invoice" | "receipt">(
    "receipt",
  );
  const [paymentMethod, setPaymentMethod] =
    React.useState<PaymentMethodKey>("nakit");

  const [customerId, setCustomerId] = React.useState<string | null>(null);
  const [customerQuery, setCustomerQuery] = React.useState("");
  const [customerHits, setCustomerHits] = React.useState<SaleCustomerHit[]>([]);
  const [customerSearching, setCustomerSearching] = React.useState(false);

  const [buyerName, setBuyerName] = React.useState("");
  const [buyerTaxOffice, setBuyerTaxOffice] = React.useState("");
  const [buyerTaxNumber, setBuyerTaxNumber] = React.useState("");
  const [buyerAddress, setBuyerAddress] = React.useState("");
  const [buyerPhone, setBuyerPhone] = React.useState("");
  const [buyerEmail, setBuyerEmail] = React.useState("");
  const [notes, setNotes] = React.useState("");

  const [productQuery, setProductQuery] = React.useState("");
  const [productHits, setProductHits] = React.useState<SaleProductHit[]>([]);
  const [productSearching, setProductSearching] = React.useState(false);
  const [lines, setLines] = React.useState<CartLine[]>([]);

  const productSearchRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    setDocumentType(buyerType === "corporate" ? "invoice" : "receipt");
  }, [buyerType]);

  React.useEffect(() => {
    const term = productQuery.trim();
    if (term.length < 1) {
      setProductHits([]);
      return;
    }
    const handle = window.setTimeout(async () => {
      setProductSearching(true);
      try {
        const hits = await searchSaleProducts(term);
        setProductHits(hits);
      } catch {
        setProductHits([]);
      } finally {
        setProductSearching(false);
      }
    }, 280);
    return () => window.clearTimeout(handle);
  }, [productQuery]);

  React.useEffect(() => {
    const term = customerQuery.trim();
    if (term.length < 1) {
      setCustomerHits([]);
      return;
    }
    const handle = window.setTimeout(async () => {
      setCustomerSearching(true);
      try {
        const hits = await searchSaleCustomers(term);
        setCustomerHits(hits);
      } catch {
        setCustomerHits([]);
      } finally {
        setCustomerSearching(false);
      }
    }, 280);
    return () => window.clearTimeout(handle);
  }, [customerQuery]);

  function selectCustomer(hit: SaleCustomerHit) {
    setCustomerId(hit.id);
    setCustomerQuery(hit.label);
    setCustomerHits([]);
    const isCorp = hit.accountType === "corporate";
    setBuyerType(isCorp ? "corporate" : "individual");
    const person = [hit.firstName, hit.lastName].filter(Boolean).join(" ");
    setBuyerName(
      isCorp
        ? hit.companyTitle || hit.companyName || person || hit.email
        : person || hit.companyName || hit.email,
    );
    setBuyerTaxOffice(hit.taxOffice ?? "");
    setBuyerTaxNumber(hit.taxNumber ?? "");
    setBuyerPhone(hit.phone ?? "");
    setBuyerEmail(hit.email);
  }

  function clearCustomer() {
    setCustomerId(null);
    setCustomerQuery("");
    setCustomerHits([]);
  }

  function addProduct(product: SaleProductHit, variantId?: string | null) {
    const variant = variantId
      ? product.variants.find((v) => v.id === variantId)
      : null;
    const stock = variant ? variant.stock : product.stock;
    if (stock <= 0) {
      toast({
        tone: "error",
        title: "Stok yok",
        description: `${product.name} için stok bulunmuyor.`,
      });
      return;
    }

    const key = `${product.id}:${variant?.id ?? "base"}`;
    setLines((prev) => {
      const existing = prev.find((line) => line.key === key);
      if (existing) {
        if (existing.quantity >= existing.maxStock) {
          toast({
            tone: "error",
            title: "Stok limiti",
            description: "Maksimum stok miktarına ulaşıldı.",
          });
          return prev;
        }
        return prev.map((line) =>
          line.key === key
            ? { ...line, quantity: line.quantity + 1 }
            : line,
        );
      }
      return [
        ...prev,
        {
          key,
          productId: product.id,
          variantId: variant?.id ?? null,
          name: product.name,
          variantName: variant?.name ?? null,
          sku: variant?.sku || product.sku,
          unitPrice: variant?.price ?? product.price,
          taxRate: product.taxRate,
          quantity: 1,
          maxStock: stock,
        },
      ];
    });
    setProductQuery("");
    setProductHits([]);
    productSearchRef.current?.focus();
  }

  function updateQty(key: string, quantity: number) {
    setLines((prev) =>
      prev.map((line) => {
        if (line.key !== key) return line;
        const next = Math.max(1, Math.min(line.maxStock, Math.floor(quantity) || 1));
        return { ...line, quantity: next };
      }),
    );
  }

  function updatePrice(key: string, unitPrice: number) {
    setLines((prev) =>
      prev.map((line) =>
        line.key === key
          ? { ...line, unitPrice: Math.max(0, unitPrice) }
          : line,
      ),
    );
  }

  function removeLine(key: string) {
    setLines((prev) => prev.filter((line) => line.key !== key));
  }

  const totals = computeInvoiceTotals(
    lines.map((line) => ({
      description: line.name,
      quantity: line.quantity,
      unitPrice: line.unitPrice,
      taxRate: line.taxRate,
      discount: 0,
    })),
  );

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!buyerName.trim()) {
      toast({
        tone: "error",
        title: "Alıcı gerekli",
        description: "Firma veya kişi adını girin.",
      });
      return;
    }
    if (!lines.length) {
      toast({
        tone: "error",
        title: "Ürün yok",
        description: "En az bir ürün ekleyin.",
      });
      return;
    }

    setSaving(true);
    try {
      const result = await createProductOutbound({
        buyerType,
        documentType,
        paymentMethod,
        customerId,
        buyerName,
        buyerTaxOffice: buyerTaxOffice || null,
        buyerTaxNumber: buyerTaxNumber || null,
        buyerAddress: buyerAddress || null,
        buyerPhone: buyerPhone || null,
        buyerEmail: buyerEmail || null,
        notes: notes || null,
        items: lines.map((line) => ({
          productId: line.productId,
          variantId: line.variantId,
          quantity: line.quantity,
          unitPrice: line.unitPrice,
        })),
      });

      if (!result.ok) {
        toast({
          tone: "error",
          title: "İşlem başarısız",
          description: errorMessage(result.error),
        });
        return;
      }

      toast({
        tone: "success",
        title: "Ürün çıkışı tamamlandı",
        description: `${result.invoiceNumber} · ${formatCurrency(result.grandTotal)}`,
      });
      router.push(`/admin/invoices/${result.invoiceId}`);
      router.refresh();
    } catch {
      toast({
        tone: "error",
        title: "İşlem başarısız",
        description: errorMessage("CREATE_FAILED"),
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4 pb-28 lg:pb-4">
      <section className="border border-[var(--bv-border)] bg-white p-4 sm:p-5">
        <h2 className="text-sm font-semibold tracking-wide text-[var(--bv-ink)]">
          Alıcı
        </h2>
        <div className="mt-3 grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => setBuyerType("individual")}
            className={cn(
              "flex items-center justify-center gap-2 rounded-[var(--radius-md)] border px-3 py-2.5 text-sm font-medium transition-colors",
              buyerType === "individual"
                ? "border-[var(--bv-ink)] bg-[var(--bv-ink)] text-white"
                : "border-[var(--bv-border-strong)] text-[var(--bv-slate)] hover:bg-[var(--bv-fog)]",
            )}
          >
            <User className="h-4 w-4" />
            Kişi
          </button>
          <button
            type="button"
            onClick={() => setBuyerType("corporate")}
            className={cn(
              "flex items-center justify-center gap-2 rounded-[var(--radius-md)] border px-3 py-2.5 text-sm font-medium transition-colors",
              buyerType === "corporate"
                ? "border-[var(--bv-ink)] bg-[var(--bv-ink)] text-white"
                : "border-[var(--bv-border-strong)] text-[var(--bv-slate)] hover:bg-[var(--bv-fog)]",
            )}
          >
            <Building2 className="h-4 w-4" />
            Firma
          </button>
        </div>

        <div className="relative mt-4">
          <Input
            label="Kayıtlı müşteri ara"
            value={customerQuery}
            onChange={(e) => {
              setCustomerQuery(e.target.value);
              setCustomerId(null);
            }}
            placeholder="Ad, e-posta, vergi no, telefon…"
            autoComplete="off"
          />
          {customerId ? (
            <button
              type="button"
              onClick={clearCustomer}
              className="absolute top-8 right-2 rounded p-1 text-[var(--bv-muted)] hover:bg-[var(--bv-fog)] hover:text-[var(--bv-ink)]"
              aria-label="Müşteri seçimini temizle"
            >
              <X className="h-4 w-4" />
            </button>
          ) : null}
          {customerHits.length > 0 ? (
            <ul className="absolute z-20 mt-1 max-h-48 w-full overflow-auto border border-[var(--bv-border)] bg-white shadow-[var(--shadow-md)]">
              {customerHits.map((hit) => (
                <li key={hit.id}>
                  <button
                    type="button"
                    onClick={() => selectCustomer(hit)}
                    className="flex w-full flex-col items-start gap-0.5 px-3 py-2.5 text-left text-sm hover:bg-[var(--bv-fog)]"
                  >
                    <span className="font-medium">{hit.label}</span>
                    <span className="text-xs text-[var(--bv-muted)]">
                      {hit.accountType === "corporate" ? "Firma" : "Kişi"}
                      {hit.taxNumber ? ` · VKN ${hit.taxNumber}` : ""}
                      {hit.email ? ` · ${hit.email}` : ""}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
          {customerSearching ? (
            <p className="mt-1 text-xs text-[var(--bv-muted)]">Aranıyor…</p>
          ) : null}
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <Input
            label={buyerType === "corporate" ? "Firma ünvanı" : "Ad soyad"}
            value={buyerName}
            onChange={(e) => setBuyerName(e.target.value)}
            required
            autoComplete="name"
          />
          <Input
            label="Telefon"
            value={buyerPhone}
            onChange={(e) => setBuyerPhone(e.target.value)}
            inputMode="tel"
            autoComplete="tel"
          />
          <Input
            label="E-posta"
            type="email"
            value={buyerEmail}
            onChange={(e) => setBuyerEmail(e.target.value)}
            autoComplete="email"
          />
          <Input
            label="Adres"
            value={buyerAddress}
            onChange={(e) => setBuyerAddress(e.target.value)}
            autoComplete="street-address"
          />
          {buyerType === "corporate" ? (
            <>
              <Input
                label="Vergi dairesi"
                value={buyerTaxOffice}
                onChange={(e) => setBuyerTaxOffice(e.target.value)}
              />
              <Input
                label="Vergi numarası"
                value={buyerTaxNumber}
                onChange={(e) => setBuyerTaxNumber(e.target.value)}
                required
              />
            </>
          ) : null}
        </div>
      </section>

      <section className="border border-[var(--bv-border)] bg-white p-4 sm:p-5">
        <h2 className="text-sm font-semibold tracking-wide text-[var(--bv-ink)]">
          Ürün ara ve ekle
        </h2>
        <div className="relative mt-3">
          <div className="relative">
            <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-[var(--bv-muted)]" />
            <input
              ref={productSearchRef}
              value={productQuery}
              onChange={(e) => setProductQuery(e.target.value)}
              placeholder="Ürün adı, SKU veya barkod…"
              className={cn(fieldClass, "pl-9")}
              autoComplete="off"
              inputMode="search"
            />
          </div>
          {productHits.length > 0 ? (
            <ul className="absolute z-20 mt-1 max-h-64 w-full overflow-auto border border-[var(--bv-border)] bg-white shadow-[var(--shadow-md)]">
              {productHits.map((product) => (
                <li
                  key={product.id}
                  className="border-b border-[var(--bv-border)] last:border-b-0"
                >
                  {product.variants.length > 0 ? (
                    <div className="px-3 py-2">
                      <p className="text-sm font-medium">{product.name}</p>
                      <p className="text-xs text-[var(--bv-muted)]">
                        {product.sku} · Ana stok {product.stock}
                      </p>
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {product.variants.map((variant) => (
                          <button
                            key={variant.id}
                            type="button"
                            disabled={variant.stock <= 0}
                            onClick={() => addProduct(product, variant.id)}
                            className="rounded border border-[var(--bv-border-strong)] px-2 py-1 text-xs disabled:opacity-40 hover:bg-[var(--bv-fog)]"
                          >
                            {variant.name} · {variant.stock} ·{" "}
                            {formatCurrency(variant.price ?? product.price)}
                          </button>
                        ))}
                        <button
                          type="button"
                          disabled={product.stock <= 0}
                          onClick={() => addProduct(product)}
                          className="rounded border border-[var(--bv-border-strong)] px-2 py-1 text-xs disabled:opacity-40 hover:bg-[var(--bv-fog)]"
                        >
                          Ana ürün · {product.stock}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => addProduct(product)}
                      disabled={product.stock <= 0}
                      className="flex w-full items-start justify-between gap-3 px-3 py-2.5 text-left hover:bg-[var(--bv-fog)] disabled:opacity-50"
                    >
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-medium">
                          {product.name}
                        </span>
                        <span className="text-xs text-[var(--bv-muted)]">
                          {product.sku}
                          {product.barcode ? ` · ${product.barcode}` : ""}
                          {` · Stok ${product.stock}`}
                        </span>
                      </span>
                      <span className="shrink-0 text-sm font-semibold">
                        {formatCurrency(product.price)}
                      </span>
                    </button>
                  )}
                </li>
              ))}
            </ul>
          ) : productQuery.trim() && !productSearching ? (
            <p className="mt-2 text-xs text-[var(--bv-muted)]">
              Sonuç bulunamadı.
            </p>
          ) : null}
        </div>

        {lines.length === 0 ? (
          <p className="mt-4 rounded-[var(--radius-md)] border border-dashed border-[var(--bv-border-strong)] px-3 py-8 text-center text-sm text-[var(--bv-muted)]">
            Ürün arayıp ekleyin
          </p>
        ) : (
          <ul className="mt-4 space-y-3">
            {lines.map((line) => (
              <li
                key={line.key}
                className="border border-[var(--bv-border)] p-3 sm:p-4"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{line.name}</p>
                    <p className="text-xs text-[var(--bv-muted)]">
                      {line.sku}
                      {line.variantName ? ` · ${line.variantName}` : ""}
                      {` · Max ${line.maxStock}`}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeLine(line.key)}
                    className="rounded p-1.5 text-[var(--bv-muted)] hover:bg-[var(--bv-fog)] hover:text-[var(--bv-danger)]"
                    aria-label="Satırı sil"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
                <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
                  <Input
                    label="Adet"
                    type="number"
                    min={1}
                    max={line.maxStock}
                    value={line.quantity}
                    onChange={(e) => updateQty(line.key, Number(e.target.value))}
                    inputMode="numeric"
                  />
                  <Input
                    label="Birim fiyat"
                    type="number"
                    min={0}
                    step="0.01"
                    value={line.unitPrice}
                    onChange={(e) =>
                      updatePrice(line.key, Number(e.target.value))
                    }
                    inputMode="decimal"
                  />
                  <div className="col-span-2 flex flex-col justify-end sm:col-span-1">
                    <p className="text-xs text-[var(--bv-muted)]">Satır tutarı</p>
                    <p className="text-sm font-semibold">
                      {formatCurrency(line.unitPrice * line.quantity)}
                    </p>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="border border-[var(--bv-border)] bg-white p-4 sm:p-5">
        <h2 className="text-sm font-semibold tracking-wide text-[var(--bv-ink)]">
          Ödeme ve belge
        </h2>
        <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-3">
          {PAYMENT_OPTIONS.map((option) => {
            const Icon = option.icon;
            const active = paymentMethod === option.key;
            return (
              <button
                key={option.key}
                type="button"
                onClick={() => setPaymentMethod(option.key)}
                className={cn(
                  "flex items-center justify-center gap-2 rounded-[var(--radius-md)] border px-3 py-3 text-sm font-medium transition-colors",
                  active
                    ? "border-[var(--bv-ink)] bg-[var(--bv-ink)] text-white"
                    : "border-[var(--bv-border-strong)] text-[var(--bv-slate)] hover:bg-[var(--bv-fog)]",
                )}
              >
                <Icon className="h-4 w-4" />
                {option.label}
              </button>
            );
          })}
        </div>

        <div className="mt-4 grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => setDocumentType("invoice")}
            className={cn(
              "rounded-[var(--radius-md)] border px-3 py-2.5 text-sm font-medium",
              documentType === "invoice"
                ? "border-[var(--bv-teal)] bg-[var(--bv-teal)] text-white"
                : "border-[var(--bv-border-strong)] text-[var(--bv-slate)]",
            )}
          >
            Fatura
          </button>
          <button
            type="button"
            onClick={() => setDocumentType("receipt")}
            className={cn(
              "rounded-[var(--radius-md)] border px-3 py-2.5 text-sm font-medium",
              documentType === "receipt"
                ? "border-[var(--bv-teal)] bg-[var(--bv-teal)] text-white"
                : "border-[var(--bv-border-strong)] text-[var(--bv-slate)]",
            )}
          >
            Makbuz
          </button>
        </div>

        <div className="mt-4">
          <label className="text-sm font-medium text-[var(--bv-ink)]">
            Not
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
            className={cn(fieldClass, "mt-1.5 h-auto py-2")}
            placeholder="İsteğe bağlı not…"
          />
        </div>

        <div className="mt-4 space-y-1 border-t border-[var(--bv-border)] pt-4 text-sm">
          <div className="flex justify-between text-[var(--bv-muted)]">
            <span>Ara toplam</span>
            <span>{formatCurrency(totals.subtotal)}</span>
          </div>
          {totals.taxTotal > 0 ? (
            <div className="flex justify-between text-[var(--bv-muted)]">
              <span>KDV</span>
              <span>{formatCurrency(totals.taxTotal)}</span>
            </div>
          ) : null}
          <div className="flex justify-between text-base font-semibold">
            <span>Genel toplam</span>
            <span>{formatCurrency(totals.grandTotal)}</span>
          </div>
        </div>
      </section>

      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-[var(--bv-border)] bg-white p-3 lg:static lg:border-0 lg:bg-transparent lg:p-0">
        <Button
          type="submit"
          size="lg"
          className="w-full"
          disabled={saving || lines.length === 0}
        >
          <Plus className="h-4 w-4" />
          {saving
            ? "Kaydediliyor…"
            : `Çıkış yap · ${formatCurrency(totals.grandTotal)}`}
        </Button>
      </div>
    </form>
  );
}
