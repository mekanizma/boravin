import Link from "next/link";
import { and, desc, eq, ne, or, sql } from "drizzle-orm";
import { Plus } from "lucide-react";
import { db } from "@/lib/db";
import { invoices } from "@/lib/db/schema";
import { ensureInvoiceTables } from "@/lib/invoices/ensure";
import {
  formatInvoiceDate,
  INVOICE_PAYMENT_LABELS,
  INVOICE_STATUS_LABELS,
  INVOICE_TYPE_LABELS,
  remainingBalance,
  type InvoicePaymentStatus,
  type InvoiceStatus,
  type InvoiceType,
} from "@/lib/invoices/helpers";
import { AdminTable } from "@/components/admin/admin-table";
import { StatsCard } from "@/components/admin/stats-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/utils";

const PAYMENT_FILTERS = [
  { id: "all", label: "Tümü" },
  { id: "unpaid", label: "Ödenmedi" },
  { id: "partial", label: "Kısmi" },
  { id: "paid", label: "Ödendi" },
  { id: "open", label: "Açık bakiyeler" },
] as const;

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

function paymentTone(status: string) {
  if (status === "paid") return "success" as const;
  if (status === "partial") return "warning" as const;
  return "danger" as const;
}

function paymentLabel(status: string | null) {
  if (status && status in INVOICE_PAYMENT_LABELS) {
    return INVOICE_PAYMENT_LABELS[status as InvoicePaymentStatus];
  }
  return "Ödenmedi";
}

async function loadSummary() {
  try {
    await ensureInvoiceTables();
    const [row] = await db
      .select({
        unpaidCount: sql<number>`count(*) filter (where ${invoices.paymentStatus} = 'unpaid' and ${invoices.status} <> 'cancelled')::int`,
        partialCount: sql<number>`count(*) filter (where ${invoices.paymentStatus} = 'partial' and ${invoices.status} <> 'cancelled')::int`,
        paidCount: sql<number>`count(*) filter (where ${invoices.paymentStatus} = 'paid' and ${invoices.status} <> 'cancelled')::int`,
        openAmount: sql<number>`coalesce(sum(case when ${invoices.status} <> 'cancelled' and ${invoices.paymentStatus} in ('unpaid','partial') then (${invoices.grandTotal}::numeric - coalesce(${invoices.paidAmount},0)::numeric) else 0 end), 0)::float`,
      })
      .from(invoices);
    return (
      row ?? {
        unpaidCount: 0,
        partialCount: 0,
        paidCount: 0,
        openAmount: 0,
      }
    );
  } catch {
    return {
      unpaidCount: 0,
      partialCount: 0,
      paidCount: 0,
      openAmount: 0,
    };
  }
}

async function loadRows(paymentFilter: string) {
  try {
    await ensureInvoiceTables();
    const conditions = [];
    if (paymentFilter === "unpaid") {
      conditions.push(eq(invoices.paymentStatus, "unpaid"));
      conditions.push(ne(invoices.status, "cancelled"));
    } else if (paymentFilter === "partial") {
      conditions.push(eq(invoices.paymentStatus, "partial"));
      conditions.push(ne(invoices.status, "cancelled"));
    } else if (paymentFilter === "paid") {
      conditions.push(eq(invoices.paymentStatus, "paid"));
    } else if (paymentFilter === "open") {
      conditions.push(
        or(
          eq(invoices.paymentStatus, "unpaid"),
          eq(invoices.paymentStatus, "partial"),
        )!,
      );
      conditions.push(ne(invoices.status, "cancelled"));
    }

    return await db
      .select({
        id: invoices.id,
        invoiceNumber: invoices.invoiceNumber,
        type: invoices.type,
        status: invoices.status,
        buyerName: invoices.buyerName,
        grandTotal: invoices.grandTotal,
        paidAmount: invoices.paidAmount,
        paymentStatus: invoices.paymentStatus,
        dueDate: invoices.dueDate,
        issueDate: invoices.issueDate,
      })
      .from(invoices)
      .where(conditions.length ? and(...conditions) : undefined)
      .orderBy(desc(invoices.createdAt))
      .limit(100);
  } catch {
    return [];
  }
}

export default async function AdminInvoicesPage({
  searchParams,
}: {
  searchParams: Promise<{ odeme?: string }>;
}) {
  const params = await searchParams;
  const paymentFilter = PAYMENT_FILTERS.some((f) => f.id === params.odeme)
    ? (params.odeme as (typeof PAYMENT_FILTERS)[number]["id"])
    : "all";

  const [rows, summary] = await Promise.all([
    loadRows(paymentFilter),
    loadSummary(),
  ]);

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-semibold">Faturalar</h1>
          <p className="text-sm text-[var(--bv-muted)]">
            Ödenmemiş faturalar ve ödeme takibi
          </p>
        </div>
        <Link href="/admin/invoices/new" className="w-full sm:w-auto">
          <Button variant="accent" className="w-full sm:w-auto">
            <Plus className="h-4 w-4" />
            Yeni belge
          </Button>
        </Link>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatsCard
          label="Ödenmedi"
          value={summary.unpaidCount}
          href="/admin/invoices?odeme=unpaid"
        />
        <StatsCard
          label="Kısmi"
          value={summary.partialCount}
          href="/admin/invoices?odeme=partial"
        />
        <StatsCard
          label="Ödendi"
          value={summary.paidCount}
          href="/admin/invoices?odeme=paid"
        />
        <StatsCard
          label="Açık bakiye"
          value={formatCurrency(summary.openAmount)}
          hint="Ödenmemiş + kısmi"
          href="/admin/invoices?odeme=open"
        />
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1">
        {PAYMENT_FILTERS.map((item) => {
          const active = paymentFilter === item.id;
          const href =
            item.id === "all"
              ? "/admin/invoices"
              : `/admin/invoices?odeme=${item.id}`;
          return (
            <Link
              key={item.id}
              href={href}
              className={
                active
                  ? "shrink-0 rounded-[var(--radius-md)] bg-[var(--bv-ink)] px-3 py-1.5 text-xs font-semibold whitespace-nowrap text-white"
                  : "shrink-0 rounded-[var(--radius-md)] border border-[var(--bv-border-strong)] px-3 py-1.5 text-xs font-semibold whitespace-nowrap text-[var(--bv-slate)] hover:bg-[var(--bv-fog)]"
              }
            >
              {item.label}
            </Link>
          );
        })}
      </div>

      <AdminTable
        rows={rows}
        emptyMessage="Bu filtrede belge yok"
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
            header: "Belge",
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
              <Badge tone={paymentTone(r.paymentStatus ?? "unpaid")}>
                {paymentLabel(r.paymentStatus)}
              </Badge>
            ),
          },
          {
            key: "total",
            header: "Toplam",
            cell: (r) => formatCurrency(r.grandTotal),
          },
          {
            key: "remaining",
            header: "Kalan",
            cell: (r) => {
              const left = remainingBalance(
                Number(r.grandTotal),
                Number(r.paidAmount ?? 0),
              );
              return (
                <span
                  className={
                    left > 0
                      ? "font-medium text-[var(--bv-sale)]"
                      : "text-[var(--bv-muted)]"
                  }
                >
                  {formatCurrency(left)}
                </span>
              );
            },
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
              <div className="flex flex-col items-end gap-1 sm:flex-row sm:items-center">
                <Link
                  href={`/admin/invoices/${r.id}`}
                  className="text-xs font-medium text-[var(--bv-teal)] hover:underline"
                >
                  Takip
                </Link>
                <Link
                  href={`/admin/invoices/${r.id}/print`}
                  className="text-xs font-medium text-[var(--bv-muted)] hover:underline"
                >
                  Yazdır
                </Link>
              </div>
            ),
          },
        ]}
      />
    </div>
  );
}
