"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";
import { createInvoice } from "@/features/invoices/actions";
import {
  computeInvoiceTotals,
  INVOICE_TYPE_LABELS,
  type InvoiceType,
} from "@/lib/invoices/helpers";
import { formatCurrency } from "@/lib/utils";

type Line = {
  key: string;
  description: string;
  sku: string;
  quantity: string;
  unitPrice: string;
  taxRate: string;
  discount: string;
};

export type InvoiceFormPrefill = {
  type?: InvoiceType;
  orderId?: string | null;
  customerId?: string | null;
  buyerName?: string;
  buyerTaxOffice?: string;
  buyerTaxNumber?: string;
  buyerAddress?: string;
  buyerPhone?: string;
  buyerEmail?: string;
  paymentMethod?: string;
  paymentStatus?: "unpaid" | "partial" | "paid";
  notes?: string;
  items?: Array<{
    description: string;
    sku?: string | null;
    quantity: number;
    unitPrice: number;
    taxRate?: number;
    discount?: number;
  }>;
};

type Prefill = InvoiceFormPrefill;

const fieldClass =
  "h-10 w-full rounded-[var(--radius-md)] border border-[var(--bv-border-strong)] bg-white px-3 text-sm text-[var(--bv-ink)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]";

function emptyLine(): Line {
  return {
    key: crypto.randomUUID(),
    description: "",
    sku: "",
    quantity: "1",
    unitPrice: "0",
    taxRate: "0",
    discount: "0",
  };
}

export function InvoiceForm({ prefill }: { prefill?: Prefill }) {
  const router = useRouter();
  const { toast } = useToast();
  const [saving, setSaving] = React.useState(false);
  const [type, setType] = React.useState<InvoiceType>(prefill?.type ?? "invoice");
  const [status, setStatus] = React.useState<"draft" | "issued">("issued");
  const [buyerName, setBuyerName] = React.useState(prefill?.buyerName ?? "");
  const [buyerTaxOffice, setBuyerTaxOffice] = React.useState(
    prefill?.buyerTaxOffice ?? "",
  );
  const [buyerTaxNumber, setBuyerTaxNumber] = React.useState(
    prefill?.buyerTaxNumber ?? "",
  );
  const [buyerAddress, setBuyerAddress] = React.useState(
    prefill?.buyerAddress ?? "",
  );
  const [buyerPhone, setBuyerPhone] = React.useState(prefill?.buyerPhone ?? "");
  const [buyerEmail, setBuyerEmail] = React.useState(prefill?.buyerEmail ?? "");
  const [paymentMethod, setPaymentMethod] = React.useState(
    prefill?.paymentMethod ?? "",
  );
  const [paymentStatus, setPaymentStatus] = React.useState<
    "unpaid" | "partial" | "paid"
  >(prefill?.paymentStatus ?? "unpaid");
  const [notes, setNotes] = React.useState(prefill?.notes ?? "");
  const [issueDate, setIssueDate] = React.useState(
    new Date().toISOString().slice(0, 10),
  );
  const [dueDate, setDueDate] = React.useState("");
  const [lines, setLines] = React.useState<Line[]>(() =>
    prefill?.items?.length
      ? prefill.items.map((item) => ({
          key: crypto.randomUUID(),
          description: item.description,
          sku: item.sku ?? "",
          quantity: String(item.quantity),
          unitPrice: String(item.unitPrice),
          taxRate: String(item.taxRate ?? 0),
          discount: String(item.discount ?? 0),
        }))
      : [emptyLine()],
  );

  const totals = computeInvoiceTotals(
    lines.map((line) => ({
      description: line.description || "—",
      quantity: Number(line.quantity) || 0,
      unitPrice: Number(line.unitPrice) || 0,
      taxRate: Number(line.taxRate) || 0,
      discount: Number(line.discount) || 0,
    })),
  );

  function updateLine(key: string, patch: Partial<Line>) {
    setLines((prev) =>
      prev.map((line) => (line.key === key ? { ...line, ...patch } : line)),
    );
  }

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!buyerName.trim()) {
      toast({ title: "Alıcı adı gerekli", tone: "error" });
      return;
    }
    const validLines = lines.filter((line) => line.description.trim());
    if (!validLines.length) {
      toast({ title: "En az bir kalem ekleyin", tone: "error" });
      return;
    }

    setSaving(true);
    try {
      const result = await createInvoice({
        type,
        status,
        orderId: prefill?.orderId ?? null,
        customerId: prefill?.customerId ?? null,
        issueDate,
        dueDate: dueDate || null,
        buyerName,
        buyerTaxOffice: buyerTaxOffice || null,
        buyerTaxNumber: buyerTaxNumber || null,
        buyerAddress: buyerAddress || null,
        buyerPhone: buyerPhone || null,
        buyerEmail: buyerEmail || null,
        paymentMethod: paymentMethod || null,
        paymentStatus,
        notes: notes || null,
        items: validLines.map((line) => ({
          description: line.description.trim(),
          sku: line.sku || null,
          quantity: Number(line.quantity),
          unitPrice: Number(line.unitPrice),
          taxRate: Number(line.taxRate) || 0,
          discount: Number(line.discount) || 0,
        })),
      });

      if (!result.ok) {
        toast({ title: "Fatura oluşturulamadı", tone: "error" });
        return;
      }

      toast({
        title: `${INVOICE_TYPE_LABELS[type]} kesildi`,
        description: result.invoiceNumber,
        tone: "success",
      });
      router.push(`/admin/invoices/${result.id}`);
      router.refresh();
    } catch {
      toast({ title: "Fatura oluşturulamadı", tone: "error" });
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      <section className="space-y-4 border border-[var(--bv-border)] bg-white p-4 sm:p-6">
        <h2 className="font-display text-lg font-semibold">Belge bilgileri</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium" htmlFor="invoice-type">
              Tür
            </label>
            <select
              id="invoice-type"
              className={fieldClass}
              value={type}
              onChange={(e) => setType(e.target.value as InvoiceType)}
            >
              <option value="invoice">Fatura</option>
              <option value="receipt">Makbuz</option>
              <option value="proforma">Proforma</option>
            </select>
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium" htmlFor="invoice-status">
              Durum
            </label>
            <select
              id="invoice-status"
              className={fieldClass}
              value={status}
              onChange={(e) => setStatus(e.target.value as "draft" | "issued")}
            >
              <option value="issued">Hemen kes</option>
              <option value="draft">Taslak kaydet</option>
            </select>
          </div>
          <Input
            label="Belge tarihi"
            type="date"
            value={issueDate}
            onChange={(e) => setIssueDate(e.target.value)}
          />
          <Input
            label="Vade tarihi"
            type="date"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
          />
        </div>
      </section>

      <section className="space-y-4 border border-[var(--bv-border)] bg-white p-4 sm:p-6">
        <h2 className="font-display text-lg font-semibold">Alıcı</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <Input
            label="Ad / Ünvan"
            value={buyerName}
            onChange={(e) => setBuyerName(e.target.value)}
            required
          />
          <Input
            label="E-posta"
            type="email"
            value={buyerEmail}
            onChange={(e) => setBuyerEmail(e.target.value)}
          />
          <Input
            label="Telefon"
            value={buyerPhone}
            onChange={(e) => setBuyerPhone(e.target.value)}
          />
          <Input
            label="Vergi dairesi"
            value={buyerTaxOffice}
            onChange={(e) => setBuyerTaxOffice(e.target.value)}
          />
          <Input
            label="Vergi / TC no"
            value={buyerTaxNumber}
            onChange={(e) => setBuyerTaxNumber(e.target.value)}
          />
          <Input
            label="Adres"
            value={buyerAddress}
            onChange={(e) => setBuyerAddress(e.target.value)}
          />
        </div>
      </section>

      <section className="space-y-4 border border-[var(--bv-border)] bg-white p-4 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-display text-lg font-semibold">Kalemler</h2>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setLines((prev) => [...prev, emptyLine()])}
          >
            <Plus className="h-4 w-4" />
            Kalem ekle
          </Button>
        </div>

        <div className="space-y-3">
          {lines.map((line, index) => (
            <div
              key={line.key}
              className="grid gap-2 rounded-[var(--radius-md)] border border-[var(--bv-border)] p-3 sm:grid-cols-12"
            >
              <div className="sm:col-span-4">
                <Input
                  label={index === 0 ? "Açıklama" : undefined}
                  placeholder="Ürün / hizmet"
                  value={line.description}
                  onChange={(e) =>
                    updateLine(line.key, { description: e.target.value })
                  }
                />
              </div>
              <div className="sm:col-span-2">
                <Input
                  label={index === 0 ? "SKU" : undefined}
                  value={line.sku}
                  onChange={(e) => updateLine(line.key, { sku: e.target.value })}
                />
              </div>
              <div className="sm:col-span-1">
                <Input
                  label={index === 0 ? "Adet" : undefined}
                  inputMode="decimal"
                  value={line.quantity}
                  onChange={(e) =>
                    updateLine(line.key, { quantity: e.target.value })
                  }
                />
              </div>
              <div className="sm:col-span-2">
                <Input
                  label={index === 0 ? "Birim fiyat" : undefined}
                  inputMode="decimal"
                  value={line.unitPrice}
                  onChange={(e) =>
                    updateLine(line.key, { unitPrice: e.target.value })
                  }
                />
              </div>
              <div className="sm:col-span-1">
                <Input
                  label={index === 0 ? "KDV %" : undefined}
                  inputMode="decimal"
                  value={line.taxRate}
                  onChange={(e) =>
                    updateLine(line.key, { taxRate: e.target.value })
                  }
                />
              </div>
              <div className="sm:col-span-1">
                <Input
                  label={index === 0 ? "İndirim" : undefined}
                  inputMode="decimal"
                  value={line.discount}
                  onChange={(e) =>
                    updateLine(line.key, { discount: e.target.value })
                  }
                />
              </div>
              <div className="flex items-end sm:col-span-1">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="shrink-0"
                  disabled={lines.length === 1}
                  onClick={() =>
                    setLines((prev) => prev.filter((l) => l.key !== line.key))
                  }
                  aria-label="Kalemi sil"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>

        <dl className="ml-auto grid max-w-xs gap-1 text-sm">
          <div className="flex justify-between gap-4">
            <dt className="text-[var(--bv-muted)]">Ara toplam</dt>
            <dd>{formatCurrency(totals.subtotal)}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-[var(--bv-muted)]">İndirim</dt>
            <dd>{formatCurrency(totals.discountTotal)}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-[var(--bv-muted)]">KDV</dt>
            <dd>{formatCurrency(totals.taxTotal)}</dd>
          </div>
          <div className="flex justify-between gap-4 border-t border-[var(--bv-border)] pt-1 font-semibold">
            <dt>Genel toplam</dt>
            <dd>{formatCurrency(totals.grandTotal)}</dd>
          </div>
        </dl>
      </section>

      <section className="space-y-4 border border-[var(--bv-border)] bg-white p-4 sm:p-6">
        <h2 className="font-display text-lg font-semibold">Ödeme & not</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <Input
            label="Ödeme yöntemi"
            value={paymentMethod}
            onChange={(e) => setPaymentMethod(e.target.value)}
            placeholder="Nakit, kart, havale…"
          />
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium" htmlFor="pay-status">
              Ödeme durumu
            </label>
            <select
              id="pay-status"
              className={fieldClass}
              value={paymentStatus}
              onChange={(e) =>
                setPaymentStatus(e.target.value as "unpaid" | "partial" | "paid")
              }
            >
              <option value="unpaid">Ödenmedi</option>
              <option value="partial">Kısmi</option>
              <option value="paid">Ödendi</option>
            </select>
          </div>
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium" htmlFor="invoice-notes">
            Notlar
          </label>
          <textarea
            id="invoice-notes"
            className="min-h-24 w-full rounded-[var(--radius-md)] border border-[var(--bv-border-strong)] bg-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </div>
      </section>

      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <Button
          type="button"
          variant="outline"
          onClick={() => router.push("/admin/invoices")}
        >
          İptal
        </Button>
        <Button type="submit" variant="accent" disabled={saving}>
          {saving
            ? "Kaydediliyor…"
            : status === "issued"
              ? `${INVOICE_TYPE_LABELS[type]} kes`
              : "Taslak kaydet"}
        </Button>
      </div>
    </form>
  );
}
