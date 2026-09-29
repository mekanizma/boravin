import Link from "next/link";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { customers, orderItems, orders } from "@/lib/db/schema";
import {
  InvoiceForm,
  type InvoiceFormPrefill,
} from "@/components/admin/invoice-form";
import { Button } from "@/components/ui/button";
import type { InvoiceType } from "@/lib/invoices/helpers";

export default async function AdminNewInvoicePage({
  searchParams,
}: {
  searchParams: Promise<{ orderId?: string; type?: string }>;
}) {
  const params = await searchParams;
  const type = (["invoice", "receipt", "proforma"].includes(params.type ?? "")
    ? params.type
    : "invoice") as InvoiceType;

  let prefill: InvoiceFormPrefill | undefined;

  if (params.orderId) {
    try {
      const order = await db.query.orders.findFirst({
        where: eq(orders.id, params.orderId),
      });
      if (order) {
        const items = await db
          .select()
          .from(orderItems)
          .where(eq(orderItems.orderId, order.id));
        let customer = null as typeof customers.$inferSelect | null;
        if (order.customerId) {
          customer =
            (await db.query.customers.findFirst({
              where: eq(customers.id, order.customerId),
            })) ?? null;
        }
        const billing = (order.billingAddress ?? {}) as Record<string, string>;
        const shipping = (order.shippingAddress ?? {}) as Record<string, string>;
        prefill = {
          type,
          orderId: order.id,
          customerId: order.customerId,
          buyerName:
            billing.fullName ||
            shipping.fullName ||
            [customer?.firstName, customer?.lastName].filter(Boolean).join(" ") ||
            customer?.companyTitle ||
            customer?.companyName ||
            order.guestEmail ||
            "Müşteri",
          buyerTaxOffice: customer?.taxOffice ?? billing.taxOffice ?? "",
          buyerTaxNumber: customer?.taxNumber ?? billing.taxNumber ?? "",
          buyerAddress:
            [
              billing.addressLine1 ?? shipping.addressLine1,
              billing.city ?? shipping.city,
            ]
              .filter(Boolean)
              .join(", ") || "",
          buyerPhone: billing.phone || shipping.phone || customer?.phone || "",
          buyerEmail: order.guestEmail || customer?.email || "",
          paymentMethod: order.paymentMethod ?? "",
          paymentStatus: order.paymentStatus === "paid" ? "paid" : "unpaid",
          notes: order.customerNote ?? "",
          items: items.map((item) => ({
            description: item.variantName
              ? `${item.productName} (${item.variantName})`
              : item.productName,
            sku: item.sku,
            quantity: item.quantity,
            unitPrice: Number(item.unitPrice),
            taxRate: 0,
            discount: Number(item.discount ?? 0),
          })),
        };
      }
    } catch {
      prefill = { type };
    }
  } else {
    prefill = { type };
  }

  return (
    <div className="mx-auto max-w-5xl space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-semibold">Yeni belge</h1>
          <p className="text-sm text-[var(--bv-muted)]">
            Fatura, makbuz veya proforma kesin
          </p>
        </div>
        <Link href="/admin/invoices">
          <Button variant="outline">Listeye dön</Button>
        </Link>
      </div>
      <InvoiceForm prefill={prefill} />
    </div>
  );
}
