import { ProductOutboundForm } from "@/components/admin/product-outbound-form";

export default function AdminProductOutboundPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <div>
        <h1 className="font-display text-2xl font-semibold">Ürün Çıkışı</h1>
        <p className="text-sm text-[var(--bv-muted)]">
          Firma veya kişiye ürün satışı — stok düşer, fatura/makbuz oluşur
        </p>
      </div>
      <ProductOutboundForm />
    </div>
  );
}
