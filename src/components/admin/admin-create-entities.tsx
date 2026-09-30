"use client";

import { AdminCreateButton } from "@/components/admin/admin-create-button";
import {
  createAnnouncement,
  createBlogPost,
  createBrand,
  createCampaign,
  createCategory,
  createCoupon,
  createMediaFromUrl,
  createMenu,
  createPage,
  createRole,
} from "@/features/admin/create-actions";

export function NewCategoryButton({
  parents,
}: {
  parents: { id: string; name: string }[];
}) {
  return (
    <AdminCreateButton
      label="Yeni kategori"
      title="Yeni kategori"
      successTitle="Kategori eklendi"
      fields={[
        { name: "name", label: "Ad", required: true, placeholder: "Örn. Telefon" },
        {
          name: "slug",
          label: "Slug",
          hint: "Boş bırakılırsa addan üretilir.",
          placeholder: "telefon",
        },
        {
          kind: "select",
          name: "parentId",
          label: "Üst kategori",
          defaultValue: "",
          options: [
            { value: "", label: "Yok (ana kategori)" },
            ...parents.map((p) => ({ value: p.id, label: p.name })),
          ],
        },
        {
          name: "sortOrder",
          label: "Sıra",
          type: "number",
          inputMode: "numeric",
          defaultValue: "0",
        },
        {
          kind: "textarea",
          name: "description",
          label: "Açıklama",
          placeholder: "Kısa açıklama (isteğe bağlı)",
        },
      ]}
      onSubmit={(v) =>
        createCategory({
          name: v.name,
          slug: v.slug || null,
          parentId: v.parentId || null,
          sortOrder: v.sortOrder ? Number(v.sortOrder) : 0,
          description: v.description || null,
        })
      }
    />
  );
}

export function NewBrandButton() {
  return (
    <AdminCreateButton
      label="Yeni marka"
      title="Yeni marka"
      successTitle="Marka eklendi"
      fields={[
        { name: "name", label: "Ad", required: true, placeholder: "Örn. Apple" },
        {
          name: "slug",
          label: "Slug",
          hint: "Boş bırakılırsa addan üretilir.",
          placeholder: "apple",
        },
        {
          kind: "textarea",
          name: "description",
          label: "Açıklama",
          placeholder: "Marka açıklaması (isteğe bağlı)",
        },
      ]}
      onSubmit={(v) =>
        createBrand({
          name: v.name,
          slug: v.slug || null,
          description: v.description || null,
        })
      }
    />
  );
}

export function NewCampaignButton() {
  return (
    <AdminCreateButton
      label="Yeni kampanya"
      title="Yeni kampanya"
      successTitle="Kampanya eklendi"
      fields={[
        {
          name: "name",
          label: "Ad",
          required: true,
          placeholder: "Örn. Yaz İndirimi",
        },
        {
          name: "slug",
          label: "Slug",
          hint: "Boş bırakılırsa addan üretilir.",
        },
        {
          kind: "select",
          name: "type",
          label: "Tip",
          required: true,
          defaultValue: "percent",
          options: [
            { value: "percent", label: "Yüzde indirim" },
            { value: "fixed", label: "Sabit tutar" },
            { value: "free_shipping", label: "Ücretsiz kargo" },
            { value: "product", label: "Ürün" },
            { value: "category", label: "Kategori" },
            { value: "brand", label: "Marka" },
            { value: "buy_x_get_y", label: "Al X öde Y" },
            { value: "coupon", label: "Kupon" },
          ],
        },
        {
          name: "value",
          label: "Değer",
          type: "number",
          inputMode: "decimal",
          placeholder: "20",
          hint: "Yüzde veya tutar.",
        },
        {
          kind: "select",
          name: "status",
          label: "Durum",
          defaultValue: "draft",
          options: [
            { value: "draft", label: "Taslak" },
            { value: "published", label: "Yayında" },
          ],
        },
        {
          kind: "textarea",
          name: "shortDescription",
          label: "Kısa açıklama",
        },
      ]}
      onSubmit={(v) =>
        createCampaign({
          name: v.name,
          slug: v.slug || null,
          type: v.type as
            | "percent"
            | "fixed"
            | "product"
            | "category"
            | "brand"
            | "buy_x_get_y"
            | "free_shipping"
            | "coupon",
          value: v.value ? Number(v.value) : null,
          status: (v.status as "draft" | "published") || "draft",
          shortDescription: v.shortDescription || null,
        })
      }
    />
  );
}

export function NewCouponButton() {
  return (
    <AdminCreateButton
      label="Yeni kupon"
      title="Yeni kupon"
      successTitle="Kupon eklendi"
      fields={[
        {
          name: "code",
          label: "Kod",
          required: true,
          placeholder: "WELCOME10",
        },
        {
          kind: "select",
          name: "type",
          label: "Tip",
          required: true,
          defaultValue: "percent",
          options: [
            { value: "percent", label: "Yüzde" },
            { value: "fixed", label: "Sabit tutar" },
          ],
        },
        {
          name: "value",
          label: "Değer",
          type: "number",
          inputMode: "decimal",
          required: true,
          placeholder: "10",
        },
        {
          name: "minCartAmount",
          label: "Min. sepet tutarı",
          type: "number",
          inputMode: "decimal",
          placeholder: "500",
        },
        {
          name: "usageLimit",
          label: "Kullanım limiti",
          type: "number",
          inputMode: "numeric",
          placeholder: "100",
        },
      ]}
      onSubmit={(v) =>
        createCoupon({
          code: v.code,
          type: v.type as "percent" | "fixed",
          value: Number(v.value),
          minCartAmount: v.minCartAmount ? Number(v.minCartAmount) : null,
          usageLimit: v.usageLimit ? Number(v.usageLimit) : null,
        })
      }
    />
  );
}

export function NewAnnouncementButton() {
  return (
    <AdminCreateButton
      label="Yeni duyuru"
      title="Yeni duyuru"
      successTitle="Duyuru eklendi"
      fields={[
        { name: "title", label: "Başlık", required: true },
        {
          kind: "select",
          name: "type",
          label: "Tip",
          required: true,
          defaultValue: "top_bar",
          options: [
            { value: "top_bar", label: "Üst bar" },
            { value: "popup", label: "Popup" },
            { value: "homepage_banner", label: "Anasayfa banner" },
            { value: "campaign_banner", label: "Kampanya banner" },
          ],
        },
        {
          kind: "select",
          name: "status",
          label: "Durum",
          defaultValue: "draft",
          options: [
            { value: "draft", label: "Taslak" },
            { value: "published", label: "Yayında" },
          ],
        },
        {
          kind: "textarea",
          name: "description",
          label: "Açıklama",
        },
        {
          name: "linkUrl",
          label: "Link",
          placeholder: "/urunler",
        },
        {
          name: "cta",
          label: "Buton metni",
          placeholder: "İncele",
        },
      ]}
      onSubmit={(v) =>
        createAnnouncement({
          title: v.title,
          type: v.type as
            | "top_bar"
            | "popup"
            | "homepage_banner"
            | "campaign_banner",
          status: (v.status as "draft" | "published") || "draft",
          description: v.description || null,
          linkUrl: v.linkUrl || null,
          cta: v.cta || null,
        })
      }
    />
  );
}

export function NewPageButton() {
  return (
    <AdminCreateButton
      label="Yeni sayfa"
      title="Yeni sayfa"
      successTitle="Sayfa eklendi"
      fields={[
        { name: "title", label: "Başlık", required: true },
        {
          name: "slug",
          label: "Slug",
          hint: "Boş bırakılırsa başlıktan üretilir.",
        },
        {
          kind: "select",
          name: "status",
          label: "Durum",
          defaultValue: "draft",
          options: [
            { value: "draft", label: "Taslak" },
            { value: "published", label: "Yayında" },
          ],
        },
        {
          kind: "textarea",
          name: "content",
          label: "İçerik",
          rows: 6,
        },
      ]}
      onSubmit={(v) =>
        createPage({
          title: v.title,
          slug: v.slug || null,
          status: (v.status as "draft" | "published") || "draft",
          content: v.content || null,
        })
      }
    />
  );
}

export function NewBlogPostButton() {
  return (
    <AdminCreateButton
      label="Yeni yazı"
      title="Yeni yazı"
      successTitle="Yazı eklendi"
      fields={[
        { name: "title", label: "Başlık", required: true },
        {
          name: "slug",
          label: "Slug",
          hint: "Boş bırakılırsa başlıktan üretilir.",
        },
        {
          name: "category",
          label: "Kategori",
          placeholder: "Haberler",
        },
        {
          kind: "select",
          name: "status",
          label: "Durum",
          defaultValue: "draft",
          options: [
            { value: "draft", label: "Taslak" },
            { value: "published", label: "Yayında" },
          ],
        },
        {
          kind: "textarea",
          name: "excerpt",
          label: "Özet",
          rows: 2,
        },
        {
          kind: "textarea",
          name: "content",
          label: "İçerik",
          rows: 6,
        },
      ]}
      onSubmit={(v) =>
        createBlogPost({
          title: v.title,
          slug: v.slug || null,
          category: v.category || null,
          status: (v.status as "draft" | "published") || "draft",
          excerpt: v.excerpt || null,
          content: v.content || null,
        })
      }
    />
  );
}

export function NewMenuButton() {
  return (
    <AdminCreateButton
      label="Menü ekle"
      title="Yeni menü"
      successTitle="Menü eklendi"
      fields={[
        {
          name: "name",
          label: "Ad",
          required: true,
          placeholder: "Örn. Ana menü",
        },
        {
          name: "code",
          label: "Kod",
          required: true,
          placeholder: "main",
          hint: "Benzersiz kod (main, footer…).",
        },
      ]}
      onSubmit={(v) => createMenu({ name: v.name, code: v.code })}
    />
  );
}

export function NewRoleButton() {
  return (
    <AdminCreateButton
      label="Rol ekle"
      title="Yeni rol"
      successTitle="Rol eklendi"
      fields={[
        {
          name: "name",
          label: "Ad",
          required: true,
          placeholder: "Örn. Stok sorumlusu",
        },
        {
          name: "code",
          label: "Kod",
          required: true,
          placeholder: "STOCK_MANAGER",
          hint: "Büyük harf ve alt çizgi (USER_MANAGE gerekir).",
        },
        {
          kind: "textarea",
          name: "description",
          label: "Açıklama",
          rows: 2,
        },
      ]}
      onSubmit={(v) =>
        createRole({
          name: v.name,
          code: v.code,
          description: v.description || null,
        })
      }
    />
  );
}

export function NewMediaButton() {
  return (
    <AdminCreateButton
      label="Yükle"
      title="Medya ekle"
      submitLabel="Ekle"
      successTitle="Medya eklendi"
      fields={[
        {
          name: "url",
          label: "Dosya URL’si",
          type: "url",
          required: true,
          placeholder: "https://…",
          hint: "Harici görsel veya dosya adresi.",
        },
        {
          name: "originalName",
          label: "Dosya adı",
          placeholder: "urun-gorseli.jpg",
        },
        {
          name: "folder",
          label: "Klasör",
          defaultValue: "general",
          placeholder: "products",
        },
        {
          name: "alt",
          label: "Alt metin",
          placeholder: "Görsel açıklaması",
        },
      ]}
      onSubmit={(v) =>
        createMediaFromUrl({
          url: v.url,
          originalName: v.originalName || null,
          folder: v.folder || null,
          alt: v.alt || null,
        })
      }
    />
  );
}
