"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";
import { deleteProduct, updateProduct } from "@/features/products/actions";

type CategoryOption = { id: string; label: string };
type BrandOption = { id: string; name: string };

type ProductEditValues = {
  id: string;
  name: string;
  sku: string;
  barcode: string | null;
  slug: string;
  categoryId: string | null;
  brandId: string | null;
  shortDescription: string | null;
  description: string | null;
  price: string;
  compareAtPrice: string | null;
  stock: number;
  status: "draft" | "active" | "inactive" | "archived";
  isFeatured: boolean;
  isNew: boolean;
  isCampaign: boolean;
};

const fieldClass =
  "h-12 w-full border border-[var(--bv-border-strong)] bg-white px-3 text-base text-[var(--bv-ink)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]";

export function EditProductForm({
  product,
  categories,
  brands,
}: {
  product: ProductEditValues;
  categories: CategoryOption[];
  brands: BrandOption[];
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [saving, setSaving] = React.useState(false);
  const [deleting, setDeleting] = React.useState(false);

  const [name, setName] = React.useState(product.name);
  const [sku, setSku] = React.useState(product.sku);
  const [barcode, setBarcode] = React.useState(product.barcode ?? "");
  const [slug, setSlug] = React.useState(product.slug);
  const [categoryId, setCategoryId] = React.useState(product.categoryId ?? "");
  const [brandId, setBrandId] = React.useState(product.brandId ?? "");
  const [shortDescription, setShortDescription] = React.useState(
    product.shortDescription ?? "",
  );
  const [description, setDescription] = React.useState(
    product.description ?? "",
  );
  const [price, setPrice] = React.useState(String(product.price));
  const [compareAtPrice, setCompareAtPrice] = React.useState(
    product.compareAtPrice ? String(product.compareAtPrice) : "",
  );
  const [stock, setStock] = React.useState(String(product.stock));
  const [status, setStatus] = React.useState(product.status);
  const [isFeatured, setIsFeatured] = React.useState(product.isFeatured);
  const [isNew, setIsNew] = React.useState(product.isNew);
  const [isCampaign, setIsCampaign] = React.useState(product.isCampaign);

  async function onSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await updateProduct(product.id, {
        name: name.trim(),
        sku: sku.trim(),
        barcode: barcode.trim() || null,
        slug: slug.trim() || undefined,
        categoryId: categoryId || null,
        brandId: brandId || null,
        shortDescription: shortDescription.trim() || null,
        description: description.trim() || null,
        price: Number(price),
        compareAtPrice: compareAtPrice.trim()
          ? Number(compareAtPrice)
          : null,
        stock: Number.parseInt(stock, 10) || 0,
        status,
        isFeatured,
        isNew,
        isCampaign,
      });
      toast({ title: "Ürün güncellendi", tone: "success" });
      router.refresh();
    } catch {
      toast({
        title: "Kayıt başarısız",
        description: "Alanları kontrol edip tekrar deneyin.",
        tone: "error",
      });
    } finally {
      setSaving(false);
    }
  }

  async function onDelete() {
    if (
      !window.confirm(
        `"${product.name}" ürününü silmek istediğinize emin misiniz? Bu işlem geri alınamaz.`,
      )
    ) {
      return;
    }
    setDeleting(true);
    try {
      const result = await deleteProduct(product.id);
      if (!result.ok) {
        toast({
          title: "Ürün silinemedi",
          description:
            result.error === "NOT_FOUND"
              ? "Ürün bulunamadı."
              : "Bağlı kayıtlar nedeniyle silinemedi.",
          tone: "error",
        });
        return;
      }
      toast({ title: "Ürün silindi", tone: "success" });
      router.push("/admin/products");
      router.refresh();
    } catch {
      toast({ title: "Ürün silinemedi", tone: "error" });
    } finally {
      setDeleting(false);
    }
  }

  return (
    <form onSubmit={(e) => void onSave(e)} className="space-y-5">
      <section className="space-y-4 border border-[var(--bv-border)] bg-white p-4 sm:p-5">
        <Input
          label="Ürün adı"
          name="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="h-12 text-base"
          required
        />
        <div className="grid gap-4 sm:grid-cols-2">
          <Input
            label="SKU"
            name="sku"
            value={sku}
            onChange={(e) => setSku(e.target.value)}
            className="h-12 text-base"
            required
          />
          <Input
            label="Barkod"
            name="barcode"
            value={barcode}
            onChange={(e) => setBarcode(e.target.value)}
            className="h-12 text-base"
          />
        </div>
        <Input
          label="Slug"
          name="slug"
          value={slug}
          onChange={(e) => setSlug(e.target.value)}
          className="h-12 text-base"
          hint="Mağaza URL’sinde kullanılır."
        />
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="flex flex-col gap-1.5 text-sm font-medium">
            Marka
            <select
              className={fieldClass}
              value={brandId}
              onChange={(e) => setBrandId(e.target.value)}
            >
              <option value="">Marka seçin</option>
              {brands.map((brand) => (
                <option key={brand.id} value={brand.id}>
                  {brand.name}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1.5 text-sm font-medium">
            Kategori
            <select
              className={fieldClass}
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
            >
              <option value="">Kategori seçin</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.label}
                </option>
              ))}
            </select>
          </label>
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          <Input
            label="Satış fiyatı"
            name="price"
            inputMode="decimal"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            className="h-12 text-base"
            required
          />
          <Input
            label="Karşılaştırma fiyatı"
            name="compareAtPrice"
            inputMode="decimal"
            value={compareAtPrice}
            onChange={(e) => setCompareAtPrice(e.target.value)}
            className="h-12 text-base"
          />
          <Input
            label="Stok"
            name="stock"
            inputMode="numeric"
            value={stock}
            onChange={(e) => setStock(e.target.value)}
            className="h-12 text-base"
            required
          />
        </div>
        <label className="flex flex-col gap-1.5 text-sm font-medium">
          Durum
          <select
            className={fieldClass}
            value={status}
            onChange={(e) =>
              setStatus(e.target.value as ProductEditValues["status"])
            }
          >
            <option value="draft">Taslak</option>
            <option value="active">Aktif</option>
            <option value="inactive">Pasif</option>
            <option value="archived">Arşiv</option>
          </select>
        </label>
        <div className="flex flex-wrap gap-4 text-sm">
          <label className="inline-flex items-center gap-2">
            <input
              type="checkbox"
              checked={isFeatured}
              onChange={(e) => setIsFeatured(e.target.checked)}
            />
            Öne çıkan
          </label>
          <label className="inline-flex items-center gap-2">
            <input
              type="checkbox"
              checked={isNew}
              onChange={(e) => setIsNew(e.target.checked)}
            />
            Yeni
          </label>
          <label className="inline-flex items-center gap-2">
            <input
              type="checkbox"
              checked={isCampaign}
              onChange={(e) => setIsCampaign(e.target.checked)}
            />
            Kampanya
          </label>
        </div>
        <label className="flex flex-col gap-1.5 text-sm font-medium">
          Kısa açıklama
          <textarea
            value={shortDescription}
            onChange={(e) => setShortDescription(e.target.value)}
            rows={2}
            className="border border-[var(--bv-border-strong)] px-3 py-2 text-base font-normal"
          />
        </label>
        <label className="flex flex-col gap-1.5 text-sm font-medium">
          Açıklama
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={6}
            className="border border-[var(--bv-border-strong)] px-3 py-2 text-base font-normal"
          />
        </label>
      </section>

      <div className="fixed inset-x-0 bottom-0 z-20 flex flex-col gap-2 border-t border-[var(--bv-border)] bg-white/95 p-3 backdrop-blur sm:static sm:flex-row sm:items-center sm:border-0 sm:bg-transparent sm:p-0">
        <Button
          type="button"
          variant="ghost"
          className="h-12 w-full text-[var(--bv-danger)] hover:bg-[#fff5f5] sm:mr-auto sm:w-auto"
          disabled={deleting || saving}
          onClick={() => void onDelete()}
        >
          <Trash2 className="h-4 w-4" strokeWidth={1.75} />
          {deleting ? "Siliniyor…" : "Ürünü sil"}
        </Button>
        <Link href="/admin/products" className="sm:order-none">
          <Button
            type="button"
            variant="outline"
            className="h-12 w-full sm:w-auto"
            disabled={saving || deleting}
          >
            Listeye dön
          </Button>
        </Link>
        <Button
          type="submit"
          variant="accent"
          className="h-12 w-full sm:w-auto"
          disabled={saving || deleting}
        >
          {saving ? "Kaydediliyor…" : "Değişiklikleri kaydet"}
        </Button>
      </div>
    </form>
  );
}
