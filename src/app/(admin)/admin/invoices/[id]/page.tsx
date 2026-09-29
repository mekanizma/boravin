import Link from "next/link";
import { notFound } from "next/navigation";
import { asc, desc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { invoiceItems, invoicePayments, invoices } from "@/lib/db/schema";
import { ensureInvoiceTables } from "@/lib/invoices/ensure";
import {
  INVOICE_STATUS_LABELS,
  INVOICE_TYPE_LABELS,
  type InvoiceStatus,
  type InvoiceType,
} from "@/lib/invoices/helpers";
import { InvoiceDocument } from "@/components/admin/invoice-document";
import { InvoiceActions } from "@/components/admin/invoice-actions";
import { InvoicePaymentTracker } from "@/components/admin/invoice-payment-tracker";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export default async function AdminInvoiceDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  let invoice: typeof invoices.$inferSelect | null = null;
  let items: (typeof invoiceItems.$inferSelect)[] = [];
  let payments: (typeof invoicePayments.$inferSelect)[] = [];

  try {
    await ensureInvoiceTables();
    invoice =
      (await db.query.invoices.findFirst({
        where: eq(invoices.id, id),
      })) ?? null;
    if (invoice) {
      [items, payments] = await Promise.all([
        db
          .select()
          .from(invoiceItems)
          .where(eq(invoiceItems.invoiceId, invoice.id))
          .orderBy(asc(invoiceItems.sortOrder)),
        db
          .select()
          .from(invoicePayments)
          .where(eq(invoicePayments.invoiceId, invoice.id))
          .orderBy(desc(invoicePayments.paidAt)),
      ]);
    }
  } catch {
    invoice = null;
  }

  if (!invoice) notFound();

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h1 className="font-display text-2xl font-semibold">
            {INVOICE_TYPE_LABELS[invoice.type as InvoiceType]}{" "}
            {invoice.invoiceNumber}
          </h1>
          <div className="mt-2 flex flex-wrap gap-2">
            <Badge>
              {INVOICE_TYPE_LABELS[invoice.type as InvoiceType]}
            </Badge>
            <Badge
              tone={
                invoice.status === "issued"
                  ? "success"
                  : invoice.status === "cancelled"
                    ? "danger"
                    : "warning"
              }
            >
              {INVOICE_STATUS_LABELS[invoice.status as InvoiceStatus]}
            </Badge>
          </div>
        </div>
        <div className="flex flex-col gap-2 sm:items-end">
          <InvoiceActions
            id={invoice.id}
            status={invoice.status as "draft" | "issued" | "cancelled"}
            paymentStatus={invoice.paymentStatus}
            printHref={`/admin/invoices/${invoice.id}/print`}
          />
          <div className="flex flex-wrap gap-2">
            <Link href="/admin/invoices">
              <Button variant="outline" size="sm">
                Listeye dön
              </Button>
            </Link>
            {invoice.orderId ? (
              <Link href={`/admin/orders/${invoice.orderId}`}>
                <Button variant="ghost" size="sm">
                  Siparişe git
                </Button>
              </Link>
            ) : null}
          </div>
        </div>
      </div>

      <InvoicePaymentTracker
        invoiceId={invoice.id}
        grandTotal={Number(invoice.grandTotal)}
        paidAmount={Number(invoice.paidAmount ?? 0)}
        paymentStatus={invoice.paymentStatus ?? "unpaid"}
        defaultMethod={invoice.paymentMethod}
        cancelled={invoice.status === "cancelled"}
        payments={payments.map((payment) => ({
          id: payment.id,
          amount: payment.amount,
          method: payment.method,
          paidAt: payment.paidAt,
          note: payment.note,
        }))}
      />

      <div className="overflow-hidden rounded-[var(--radius-lg)] border border-[var(--bv-border)] bg-white">
        <InvoiceDocument
          invoice={{
            ...invoice,
            type: invoice.type as InvoiceType,
            status: invoice.status as InvoiceStatus,
            items,
          }}
        />
      </div>
    </div>
  );
}
