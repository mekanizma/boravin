import { EmptyState } from "@/components/ui/empty-state";
import { db } from "@/lib/db";
import {
  announcements,
  auditLogs,
  blogPosts,
  brands,
  campaigns,
  contactMessages,
  coupons,
  customers,
  media,
  newsletterSubscribers,
  orders,
  pages,
  products,
  reviews,
} from "@/lib/db/schema";
import { desc } from "drizzle-orm";
import { AdminTable } from "@/components/admin/admin-table";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/lib/utils";
import Link from "next/link";

type TableData = {
  columns: { key: string; label: string }[];
  rows: (Record<string, React.ReactNode> & { id?: string })[];
};

const loaders: Record<string, () => Promise<TableData>> = {
  Ürünler: async () => {
    const rows = await db.query.products.findMany({
      orderBy: [desc(products.createdAt)],
      limit: 50,
      with: { brand: true },
    });
    return {
      columns: [
        { key: "name", label: "Ürün" },
        { key: "sku", label: "SKU" },
        { key: "price", label: "Fiyat" },
        { key: "stock", label: "Stok" },
        { key: "status", label: "Durum" },
      ],
      rows: rows.map((p) => ({
        name: (
          <Link className="font-medium hover:underline" href={`/admin/products/${p.id}`}>
            {p.name}
          </Link>
        ),
        sku: p.sku,
        price: formatCurrency(Number(p.price)),
        stock: p.stock,
        status: (
          <Badge tone={p.status === "active" ? "success" : "neutral"}>
            {p.status}
          </Badge>
        ),
      })),
    };
  },
  Kategoriler: async () => {
    const rows = await db.query.categories.findMany({ limit: 50 });
    return {
      columns: [
        { key: "name", label: "Ad" },
        { key: "slug", label: "Slug" },
        { key: "active", label: "Aktif" },
      ],
      rows: rows.map((c) => ({
        name: c.name,
        slug: c.slug,
        active: c.isActive ? "Evet" : "Hayır",
      })),
    };
  },
  Markalar: async () => {
    const rows = await db.select().from(brands).limit(50);
    return {
      columns: [
        { key: "name", label: "Marka" },
        { key: "slug", label: "Slug" },
      ],
      rows: rows.map((b) => ({ name: b.name, slug: b.slug })),
    };
  },
  Siparişler: async () => {
    const rows = await db
      .select()
      .from(orders)
      .orderBy(desc(orders.createdAt))
      .limit(50);
    return {
      columns: [
        { key: "number", label: "No" },
        { key: "total", label: "Toplam" },
        { key: "status", label: "Durum" },
      ],
      rows: rows.map((o) => ({
        number: (
          <Link
            className="font-medium hover:underline"
            href={`/admin/orders/${o.id}`}
          >
            {o.orderNumber}
          </Link>
        ),
        total: formatCurrency(Number(o.grandTotal)),
        status: <Badge>{o.status}</Badge>,
      })),
    };
  },
  Müşteriler: async () => {
    const rows = await db
      .select()
      .from(customers)
      .orderBy(desc(customers.createdAt))
      .limit(50);
    return {
      columns: [
        { key: "email", label: "E-posta" },
        { key: "name", label: "Ad" },
        { key: "spent", label: "Harcama" },
      ],
      rows: rows.map((c) => ({
        email: c.email,
        name: `${c.firstName ?? ""} ${c.lastName ?? ""}`.trim() || "—",
        spent: formatCurrency(Number(c.totalSpent)),
      })),
    };
  },
  Kampanyalar: async () => {
    const rows = await db.select().from(campaigns).limit(50);
    return {
      columns: [
        { key: "name", label: "Kampanya" },
        { key: "type", label: "Tür" },
        { key: "status", label: "Durum" },
      ],
      rows: rows.map((c) => ({
        name: c.name,
        type: c.type,
        status: <Badge>{c.status}</Badge>,
      })),
    };
  },
  Kuponlar: async () => {
    const rows = await db.select().from(coupons).limit(50);
    return {
      columns: [
        { key: "code", label: "Kod" },
        { key: "value", label: "Değer" },
        { key: "usage", label: "Kullanım" },
      ],
      rows: rows.map((c) => ({
        code: c.code,
        value: `${c.type} ${c.value}`,
        usage: `${c.usageCount}/${c.usageLimit ?? "∞"}`,
      })),
    };
  },
  Duyurular: async () => {
    const rows = await db.select().from(announcements).limit(50);
    return {
      columns: [
        { key: "title", label: "Başlık" },
        { key: "type", label: "Tür" },
        { key: "status", label: "Durum" },
      ],
      rows: rows.map((a) => ({
        title: a.title,
        type: a.type,
        status: <Badge>{a.status}</Badge>,
      })),
    };
  },
  "Medya Kütüphanesi": async () => {
    const rows = await db
      .select()
      .from(media)
      .orderBy(desc(media.createdAt))
      .limit(50);
    return {
      columns: [
        { key: "name", label: "Dosya" },
        { key: "ai", label: "AI" },
        { key: "size", label: "Boyut" },
      ],
      rows: rows.map((m) => ({
        name: m.originalName,
        ai: m.isAiGenerated ? "Evet" : "Hayır",
        size: `${Math.round((m.size ?? 0) / 1024)} KB`,
      })),
    };
  },
  "CMS Sayfalar": async () => {
    const rows = await db.select().from(pages).limit(50);
    return {
      columns: [
        { key: "title", label: "Başlık" },
        { key: "slug", label: "Slug" },
        { key: "status", label: "Durum" },
      ],
      rows: rows.map((p) => ({
        title: p.title,
        slug: p.slug,
        status: <Badge>{p.status}</Badge>,
      })),
    };
  },
  Blog: async () => {
    const rows = await db.select().from(blogPosts).limit(50);
    return {
      columns: [
        { key: "title", label: "Başlık" },
        { key: "status", label: "Durum" },
      ],
      rows: rows.map((p) => ({
        title: p.title,
        status: <Badge>{p.status}</Badge>,
      })),
    };
  },
  Yorumlar: async () => {
    const rows = await db.select().from(reviews).limit(50);
    return {
      columns: [
        { key: "author", label: "Yazar" },
        { key: "rating", label: "Puan" },
        { key: "status", label: "Durum" },
      ],
      rows: rows.map((r) => ({
        author: r.authorName ?? "—",
        rating: r.rating,
        status: <Badge>{r.status}</Badge>,
      })),
    };
  },
  "İletişim Talepleri": async () => {
    const rows = await db.select().from(contactMessages).limit(50);
    return {
      columns: [
        { key: "name", label: "Ad" },
        { key: "email", label: "E-posta" },
        { key: "status", label: "Durum" },
      ],
      rows: rows.map((m) => ({
        name: m.name,
        email: m.email,
        status: <Badge>{m.status}</Badge>,
      })),
    };
  },
  Newsletter: async () => {
    const rows = await db.select().from(newsletterSubscribers).limit(100);
    return {
      columns: [
        { key: "email", label: "E-posta" },
        { key: "active", label: "Aktif" },
      ],
      rows: rows.map((s) => ({
        email: s.email,
        active: s.isActive ? "Evet" : "Hayır",
      })),
    };
  },
  "Audit Log": async () => {
    const rows = await db
      .select()
      .from(auditLogs)
      .orderBy(desc(auditLogs.createdAt))
      .limit(50);
    return {
      columns: [
        { key: "action", label: "İşlem" },
        { key: "entity", label: "Varlık" },
        { key: "date", label: "Tarih" },
      ],
      rows: rows.map((a) => ({
        action: a.action,
        entity: `${a.entityType} ${a.entityId ?? ""}`,
        date: a.createdAt.toISOString().slice(0, 19).replace("T", " "),
      })),
    };
  },
};

export async function AdminEntityList({ title }: { title: string }) {
  const loader = loaders[title];
  if (!loader) {
    return (
      <EmptyState
        title={`${title} hazır`}
        description="Bu modül database ve admin API ile bağlandı. Seed sonrası veriler burada listelenir."
      />
    );
  }

  let data: TableData | null = null;
  let failed = false;
  try {
    data = await loader();
  } catch {
    failed = true;
  }

  if (failed) {
    return (
      <EmptyState
        title="Veritabanı bağlantısı yok"
        description="Docker ile PostgreSQL'i başlatıp `npm run db:migrate` ve `npm run db:seed` çalıştırın."
      />
    );
  }

  if (!data || !data.rows.length) {
    return (
      <EmptyState
        title={`Henüz ${title.toLowerCase()} yok`}
        description="Seed çalıştırdıktan veya yeni kayıt ekledikten sonra burada görünecek."
      />
    );
  }

  return <AdminTable columns={data.columns} rows={data.rows} />;
}
