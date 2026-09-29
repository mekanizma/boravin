import { notFound } from "next/navigation";
import { asc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { invoiceItems, invoices } from "@/lib/db/schema";
import { ensureInvoiceTables } from "@/lib/invoices/ensure";
import type { InvoiceStatus, InvoiceType } from "@/lib/invoices/helpers";
import { InvoiceDocument } from "@/components/admin/invoice-document";
import { PrintToolbar } from "@/components/admin/invoice-actions";

export default async function AdminInvoicePrintPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  let invoice: typeof invoices.$inferSelect | null = null;
  let items: (typeof invoiceItems.$inferSelect)[] = [];

  try {
    await ensureInvoiceTables();
    invoice =
      (await db.query.invoices.findFirst({
        where: eq(invoices.id, id),
      })) ?? null;
    if (invoice) {
      items = await db
        .select()
        .from(invoiceItems)
        .where(eq(invoiceItems.invoiceId, invoice.id))
        .orderBy(asc(invoiceItems.sortOrder));
    }
  } catch {
    invoice = null;
  }

  if (!invoice) notFound();

  return (
    <div className="invoice-print-root min-h-dvh bg-white p-4 sm:p-8">
      <PrintToolbar />
      <InvoiceDocument
        invoice={{
          ...invoice,
          type: invoice.type as InvoiceType,
          status: invoice.status as InvoiceStatus,
          items,
        }}
      />
    </div>
  );
}
