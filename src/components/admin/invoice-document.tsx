import { formatCurrency } from "@/lib/utils";
import {
  amountInWordsTr,
  formatInvoiceDate,
  INVOICE_STATUS_LABELS,
  INVOICE_TYPE_LABELS,
  type InvoiceStatus,
  type InvoiceType,
} from "@/lib/invoices/helpers";

export type InvoiceDocumentData = {
  invoiceNumber: string;
  type: InvoiceType;
  status: InvoiceStatus;
  currency: string;
  issueDate: Date | string;
  dueDate?: Date | string | null;
  sellerName: string;
  sellerTaxOffice?: string | null;
  sellerTaxNumber?: string | null;
  sellerAddress?: string | null;
  sellerPhone?: string | null;
  sellerEmail?: string | null;
  buyerName: string;
  buyerTaxOffice?: string | null;
  buyerTaxNumber?: string | null;
  buyerAddress?: string | null;
  buyerPhone?: string | null;
  buyerEmail?: string | null;
  subtotal: string | number;
  discountTotal: string | number;
  taxTotal: string | number;
  grandTotal: string | number;
  notes?: string | null;
  paymentMethod?: string | null;
  paymentStatus?: string | null;
  items: Array<{
    id: string;
    description: string;
    sku?: string | null;
    quantity: string | number;
    unitPrice: string | number;
    taxRate: string | number;
    discount: string | number;
    lineTotal: string | number;
  }>;
};

const paymentLabels: Record<string, string> = {
  unpaid: "Ödenmedi",
  partial: "Kısmi ödendi",
  paid: "Ödendi",
};

export function InvoiceDocument({
  invoice,
  compact = false,
}: {
  invoice: InvoiceDocumentData;
  compact?: boolean;
}) {
  const typeLabel = INVOICE_TYPE_LABELS[invoice.type];
  const statusLabel = INVOICE_STATUS_LABELS[invoice.status];

  return (
    <article
      className={
        compact
          ? "space-y-4 text-sm"
          : "mx-auto max-w-[210mm] space-y-6 bg-white p-4 text-sm text-black sm:p-8 print:max-w-none print:p-0"
      }
    >
      <header className="flex flex-col gap-4 border-b border-black/20 pb-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs tracking-[0.16em] text-black/60 uppercase">
            {typeLabel}
          </p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight">
            {invoice.sellerName}
          </h1>
          <div className="mt-2 space-y-0.5 text-xs text-black/70">
            {invoice.sellerAddress ? <p>{invoice.sellerAddress}</p> : null}
            {invoice.sellerTaxOffice || invoice.sellerTaxNumber ? (
              <p>
                {invoice.sellerTaxOffice}
                {invoice.sellerTaxOffice && invoice.sellerTaxNumber ? " · " : ""}
                {invoice.sellerTaxNumber
                  ? `V.No ${invoice.sellerTaxNumber}`
                  : ""}
              </p>
            ) : null}
            {invoice.sellerPhone ? <p>Tel: {invoice.sellerPhone}</p> : null}
            {invoice.sellerEmail ? <p>{invoice.sellerEmail}</p> : null}
          </div>
        </div>
        <div className="text-left sm:text-right">
          <p className="text-lg font-semibold">{typeLabel}</p>
          <p className="font-mono text-base">{invoice.invoiceNumber}</p>
          <p className="mt-2 text-xs text-black/70">
            Tarih: {formatInvoiceDate(invoice.issueDate)}
          </p>
          {invoice.dueDate ? (
            <p className="text-xs text-black/70">
              Vade: {formatInvoiceDate(invoice.dueDate)}
            </p>
          ) : null}
          <p className="mt-1 text-xs text-black/70">Durum: {statusLabel}</p>
        </div>
      </header>

      <section className="grid gap-4 sm:grid-cols-2">
        <div>
          <h2 className="text-xs font-semibold tracking-wide text-black/50 uppercase">
            Alıcı
          </h2>
          <p className="mt-1 font-semibold">{invoice.buyerName}</p>
          <div className="mt-1 space-y-0.5 text-xs text-black/70">
            {invoice.buyerAddress ? <p>{invoice.buyerAddress}</p> : null}
            {invoice.buyerTaxOffice || invoice.buyerTaxNumber ? (
              <p>
                {invoice.buyerTaxOffice}
                {invoice.buyerTaxOffice && invoice.buyerTaxNumber ? " · " : ""}
                {invoice.buyerTaxNumber ? `No ${invoice.buyerTaxNumber}` : ""}
              </p>
            ) : null}
            {invoice.buyerPhone ? <p>{invoice.buyerPhone}</p> : null}
            {invoice.buyerEmail ? <p>{invoice.buyerEmail}</p> : null}
          </div>
        </div>
        <div>
          <h2 className="text-xs font-semibold tracking-wide text-black/50 uppercase">
            Ödeme
          </h2>
          <div className="mt-1 space-y-0.5 text-xs text-black/70">
            <p>
              Durum:{" "}
              {paymentLabels[invoice.paymentStatus ?? ""] ??
                invoice.paymentStatus ??
                "—"}
            </p>
            <p>Yöntem: {invoice.paymentMethod || "—"}</p>
            <p>Para birimi: {invoice.currency}</p>
          </div>
        </div>
      </section>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[36rem] border-collapse text-left text-xs sm:text-sm">
          <thead>
            <tr className="border-y border-black/20 bg-black/[0.03]">
              <th className="px-2 py-2 font-semibold">#</th>
              <th className="px-2 py-2 font-semibold">Açıklama</th>
              <th className="px-2 py-2 font-semibold">Adet</th>
              <th className="px-2 py-2 font-semibold">Birim</th>
              <th className="px-2 py-2 font-semibold">KDV %</th>
              <th className="px-2 py-2 text-right font-semibold">Tutar</th>
            </tr>
          </thead>
          <tbody>
            {invoice.items.map((item, index) => (
              <tr key={item.id} className="border-b border-black/10">
                <td className="px-2 py-2 align-top">{index + 1}</td>
                <td className="px-2 py-2 align-top">
                  <p className="font-medium">{item.description}</p>
                  {item.sku ? (
                    <p className="text-[11px] text-black/50">{item.sku}</p>
                  ) : null}
                </td>
                <td className="px-2 py-2 align-top">{Number(item.quantity)}</td>
                <td className="px-2 py-2 align-top">
                  {formatCurrency(item.unitPrice, invoice.currency)}
                </td>
                <td className="px-2 py-2 align-top">%{Number(item.taxRate)}</td>
                <td className="px-2 py-2 text-right align-top font-medium">
                  {formatCurrency(item.lineTotal, invoice.currency)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <section className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="max-w-md space-y-2 text-xs text-black/70">
          <p>
            <span className="font-semibold text-black">Yazıyla:</span>{" "}
            {amountInWordsTr(Number(invoice.grandTotal), invoice.currency)}
          </p>
          {invoice.notes ? (
            <p>
              <span className="font-semibold text-black">Not:</span>{" "}
              {invoice.notes}
            </p>
          ) : null}
        </div>
        <dl className="w-full max-w-xs space-y-1 text-sm sm:ml-auto">
          <div className="flex justify-between gap-6">
            <dt className="text-black/60">Ara toplam</dt>
            <dd>{formatCurrency(invoice.subtotal, invoice.currency)}</dd>
          </div>
          <div className="flex justify-between gap-6">
            <dt className="text-black/60">İndirim</dt>
            <dd>{formatCurrency(invoice.discountTotal, invoice.currency)}</dd>
          </div>
          <div className="flex justify-between gap-6">
            <dt className="text-black/60">KDV</dt>
            <dd>{formatCurrency(invoice.taxTotal, invoice.currency)}</dd>
          </div>
          <div className="flex justify-between gap-6 border-t border-black/20 pt-2 text-base font-bold">
            <dt>Genel toplam</dt>
            <dd>{formatCurrency(invoice.grandTotal, invoice.currency)}</dd>
          </div>
        </dl>
      </section>

      <footer className="grid gap-8 border-t border-black/20 pt-8 text-xs text-black/60 sm:grid-cols-2">
        <div className="space-y-8">
          <p>Düzenleyen</p>
          <div className="border-t border-dashed border-black/30 pt-2">İmza</div>
        </div>
        <div className="space-y-8">
          <p>Teslim alan</p>
          <div className="border-t border-dashed border-black/30 pt-2">İmza</div>
        </div>
      </footer>
    </article>
  );
}
