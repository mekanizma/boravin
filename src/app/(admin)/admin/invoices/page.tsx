import Link from "next/link";
import { desc } from "drizzle-orm";
import { Plus } from "lucide-react";
import { db } from "@/lib/db";
import { invoices } from "@/lib/db/schema";
import { ensureInvoiceTables } from "@/lib/invoices/ensure";
import {
  formatInvoiceDate,
  INVOICE_STATUS_LABELS,
  INVOICE_TYPE_LABELS,
  type InvoiceStatus,
  type InvoiceType,
} from "@/lib/invoices/helpers";
import { AdminTable } from "@/components/admin/admin-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/utils";

async function loadRows() {
  try {
    await ensureInvoiceTables();
    return await db
      .select({
        id: invoices.id,
        invoiceNumber: invoices.invoiceNumber,
        type: invoices.type,
        status: invoices.status,
        buyerName: invoices.buyerName,
        grandTotal: invoices.grandTotal,
        paymentStatus: invoices.paymentStatus,
        issueDate: invoices.issueDate,
      })
      .from(invoices)
      .orderBy(desc(invoices.createdAt))
      .limit(100);
  } catch {
    return [];
  }
}

function statusTone(status: InvoiceStatus) {
  if (status === "issued") return "success" as const;
  if (status === "cancelled") return "danger" as const;
  return "warning" as const;
}

function typeTone(type: InvoiceType) {
  if (type === "receipt") return "info" as const;
  if (type === "proforma") return "accent" as const;
  return "neutral" as const;
}

export default async function AdminInvoicesPage() {
  const rows = await loadRows();

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-semibold">Faturalar</h1>
          <p className="text-sm text-[var(--bv-muted)]">
            Fatura, makbuz ve proforma belgeleri
          </p>
        </div>
        <Link href="/admin/invoices/new" className="w-full sm:w-auto">
          <Button variant="accent" className="w-full sm:w-auto">
            <Plus className="h-4 w-4" />
            Yeni belge
          </Button>
        </Link>
      </div>

      <AdminTable
        rows={rows}
        emptyMessage="Henüz fatura veya makbuz yok"
        columns={[
          {
            key: "number",
            header: "No",
            cell: (r) => (
              <Link
                href={`/admin/invoices/${r.id}`}
                className="font-mono text-sm font-medium hover:underline"
              >
                {r.invoiceNumber}
              </Link>
            ),
          },
          {
            key: "type",
            header: "Tür",
            cell: (r) => (
              <Badge tone={typeTone(r.type as InvoiceType)}>
                {INVOICE_TYPE_LABELS[r.type as InvoiceType]}
              </Badge>
            ),
          },
          {
            key: "buyer",
            header: "Alıcı",
            cell: (r) => r.buyerName,
          },
          {
            key: "status",
            header: "Durum",
            cell: (r) => (
              <Badge tone={statusTone(r.status as InvoiceStatus)}>
                {INVOICE_STATUS_LABELS[r.status as InvoiceStatus]}
              </Badge>
            ),
          },
          {
            key: "payment",
            header: "Ödeme",
            cell: (r) => (
              <span className="text-xs capitalize">
                {r.paymentStatus === "paid"
                  ? "Ödendi"
                  : r.paymentStatus === "partial"
                    ? "Kısmi"
                    : "Ödenmedi"}
              </span>
            ),
          },
          {
            key: "total",
            header: "Toplam",
            cell: (r) => formatCurrency(r.grandTotal),
          },
          {
            key: "date",
            header: "Tarih",
            cell: (r) => formatInvoiceDate(r.issueDate),
          },
          {
            key: "actions",
            header: "",
            cell: (r) => (
              <Link
                href={`/admin/invoices/${r.id}/print`}
                className="text-xs font-medium text-[var(--bv-teal)] hover:underline"
              >
                Yazdır
              </Link>
            ),
          },
        ]}
      />
    </div>
  );
}
