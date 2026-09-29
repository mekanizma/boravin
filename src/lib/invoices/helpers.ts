import {
  siteContact,
  siteContactAddress,
} from "@/lib/storefront/site-contact";

export type InvoiceType = "invoice" | "receipt" | "proforma";
export type InvoiceStatus = "draft" | "issued" | "cancelled";

export type InvoiceLineInput = {
  productId?: string | null;
  description: string;
  sku?: string | null;
  quantity: number;
  unitPrice: number;
  taxRate?: number;
  discount?: number;
};

export type ComputedInvoiceLine = InvoiceLineInput & {
  lineSubtotal: number;
  lineTax: number;
  lineTotal: number;
  sortOrder: number;
};

export type InvoiceTotals = {
  subtotal: number;
  discountTotal: number;
  taxTotal: number;
  grandTotal: number;
  lines: ComputedInvoiceLine[];
};

export const INVOICE_TYPE_LABELS: Record<InvoiceType, string> = {
  invoice: "Fatura",
  receipt: "Makbuz",
  proforma: "Proforma",
};

export const INVOICE_STATUS_LABELS: Record<InvoiceStatus, string> = {
  draft: "Taslak",
  issued: "Kesildi",
  cancelled: "İptal",
};

export function money(n: number) {
  return Math.round((Number.isFinite(n) ? n : 0) * 100) / 100;
}

export function computeInvoiceTotals(items: InvoiceLineInput[]): InvoiceTotals {
  const lines: ComputedInvoiceLine[] = items.map((item, index) => {
    const quantity = Math.max(0, Number(item.quantity) || 0);
    const unitPrice = Math.max(0, Number(item.unitPrice) || 0);
    const taxRate = Math.max(0, Number(item.taxRate) || 0);
    const discount = Math.max(0, Number(item.discount) || 0);
    const gross = money(quantity * unitPrice);
    const lineSubtotal = money(Math.max(0, gross - discount));
    const lineTax = money(lineSubtotal * (taxRate / 100));
    const lineTotal = money(lineSubtotal + lineTax);
    return {
      ...item,
      quantity,
      unitPrice,
      taxRate,
      discount,
      lineSubtotal,
      lineTax,
      lineTotal,
      sortOrder: index,
    };
  });

  const subtotal = money(lines.reduce((sum, line) => sum + line.lineSubtotal, 0));
  const discountTotal = money(
    lines.reduce((sum, line) => sum + (line.discount ?? 0), 0),
  );
  const taxTotal = money(lines.reduce((sum, line) => sum + line.lineTax, 0));
  const grandTotal = money(subtotal + taxTotal);

  return { subtotal, discountTotal, taxTotal, grandTotal, lines };
}

export function sellerDefaults() {
  return {
    sellerName: siteContact.companyName,
    sellerTaxOffice: siteContact.taxOffice,
    sellerTaxNumber: siteContact.taxNumber,
    sellerAddress: siteContactAddress,
    sellerPhone: siteContact.phones[0]?.display ?? "",
    sellerEmail: siteContact.email,
  };
}

export function invoiceNumberPrefix(type: InvoiceType) {
  if (type === "receipt") return "MK";
  if (type === "proforma") return "PF";
  return "FT";
}

export function formatInvoiceDate(value: Date | string | null | undefined) {
  if (!value) return "—";
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("tr-TR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

export function amountInWordsTr(amount: number, currency = "TRY") {
  const whole = Math.floor(Math.abs(amount));
  const kurus = Math.round((Math.abs(amount) - whole) * 100);
  const unit = currency === "TRY" ? "Türk Lirası" : currency;
  const frac = currency === "TRY" ? "Kuruş" : "cent";
  return `${numberToWordsTr(whole)} ${unit}${
    kurus ? ` ${numberToWordsTr(kurus)} ${frac}` : ""
  }`;
}

function numberToWordsTr(n: number): string {
  if (n === 0) return "Sıfır";
  const ones = [
    "",
    "Bir",
    "İki",
    "Üç",
    "Dört",
    "Beş",
    "Altı",
    "Yedi",
    "Sekiz",
    "Dokuz",
  ];
  const tens = [
    "",
    "On",
    "Yirmi",
    "Otuz",
    "Kırk",
    "Elli",
    "Altmış",
    "Yetmiş",
    "Seksen",
    "Doksan",
  ];
  const scales = ["", "Bin", "Milyon", "Milyar"];

  const groups: number[] = [];
  let rest = n;
  while (rest > 0) {
    groups.push(rest % 1000);
    rest = Math.floor(rest / 1000);
  }

  const parts: string[] = [];
  for (let i = groups.length - 1; i >= 0; i -= 1) {
    const g = groups[i];
    if (!g) continue;
    const h = Math.floor(g / 100);
    const t = Math.floor((g % 100) / 10);
    const o = g % 10;
    let chunk = "";
    if (h) chunk += (h === 1 ? "Yüz" : `${ones[h]}Yüz`);
    if (t) chunk += tens[t];
    if (o) chunk += ones[o];
    if (i === 1 && g === 1) chunk = "Bin";
    else if (i > 0) chunk += scales[i];
    parts.push(chunk);
  }
  return parts.join(" ").trim();
}
