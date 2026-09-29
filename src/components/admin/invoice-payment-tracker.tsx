"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";
import { formatCurrency } from "@/lib/utils";
import {
  deleteInvoicePayment,
  recordInvoicePayment,
} from "@/features/invoices/actions";
import {
  INVOICE_PAYMENT_METHODS,
  remainingBalance,
} from "@/lib/invoices/helpers";

export type PaymentRow = {
  id: string;
  amount: string;
  method: string | null;
  paidAt: Date | string;
  note: string | null;
};

export function InvoicePaymentTracker({
  invoiceId,
  grandTotal,
  paidAmount,
  paymentStatus,
  defaultMethod,
  cancelled,
  payments,
}: {
  invoiceId: string;
  grandTotal: number;
  paidAmount: number;
  paymentStatus: string;
  defaultMethod?: string | null;
  cancelled?: boolean;
  payments: PaymentRow[];
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [pending, setPending] = React.useState(false);
  const remaining = remainingBalance(grandTotal, paidAmount);

  const [amount, setAmount] = React.useState(
    remaining > 0 ? String(remaining) : "",
  );
  const [method, setMethod] = React.useState(defaultMethod ?? "Nakit");
  const [paidAt, setPaidAt] = React.useState(
    new Date().toISOString().slice(0, 10),
  );
  const [note, setNote] = React.useState("");

  React.useEffect(() => {
    setAmount(remaining > 0 ? String(remaining) : "");
  }, [remaining]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (cancelled) return;
    setPending(true);
    try {
      const result = await recordInvoicePayment({
        invoiceId,
        amount: Number(amount),
        method,
        paidAt,
        note: note || null,
      });
      if (!result.ok) {
        toast({
          tone: "error",
          title: "Ödeme kaydedilemedi",
          description:
            result.error === "AMOUNT_EXCEEDS"
              ? "Tutar kalan bakiyeyi aşıyor."
              : result.error === "CANCELLED"
                ? "İptal edilmiş faturaya ödeme eklenemez."
                : "Bilgileri kontrol edin.",
        });
        return;
      }
      toast({
        tone: "success",
        title: "Ödeme kaydedildi",
        description:
          result.paymentStatus === "paid"
            ? "Fatura tamamen ödendi."
            : `Kalan: ${formatCurrency(result.remaining)}`,
      });
      setNote("");
      router.refresh();
    } catch {
      toast({ tone: "error", title: "Ödeme kaydedilemedi" });
    } finally {
      setPending(false);
    }
  }

  async function onDelete(id: string) {
    if (!window.confirm("Bu ödeme kaydını silmek istiyor musunuz?")) return;
    setPending(true);
    try {
      const result = await deleteInvoicePayment(id);
      if (!result.ok) {
        toast({ tone: "error", title: "Ödeme silinemedi" });
        return;
      }
      toast({ tone: "success", title: "Ödeme silindi" });
      router.refresh();
    } catch {
      toast({ tone: "error", title: "Ödeme silinemedi" });
    } finally {
      setPending(false);
    }
  }

  const statusLabel =
    paymentStatus === "paid"
      ? "Ödendi"
      : paymentStatus === "partial"
        ? "Kısmi ödendi"
        : "Ödenmedi";

  return (
    <div className="space-y-4 rounded-[var(--radius-lg)] border border-[var(--bv-border)] bg-white p-4 sm:p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-sm font-semibold tracking-wide">Ödeme takibi</h2>
          <p className="mt-1 text-sm text-[var(--bv-muted)]">{statusLabel}</p>
        </div>
        <div className="grid grid-cols-3 gap-3 text-right sm:min-w-[16rem]">
          <div>
            <p className="text-[10px] font-semibold tracking-wide text-[var(--bv-muted)] uppercase">
              Toplam
            </p>
            <p className="text-sm font-semibold">{formatCurrency(grandTotal)}</p>
          </div>
          <div>
            <p className="text-[10px] font-semibold tracking-wide text-[var(--bv-muted)] uppercase">
              Ödenen
            </p>
            <p className="text-sm font-semibold text-[var(--bv-teal)]">
              {formatCurrency(paidAmount)}
            </p>
          </div>
          <div>
            <p className="text-[10px] font-semibold tracking-wide text-[var(--bv-muted)] uppercase">
              Kalan
            </p>
            <p
              className={
                remaining > 0
                  ? "text-sm font-semibold text-[var(--bv-sale)]"
                  : "text-sm font-semibold"
              }
            >
              {formatCurrency(remaining)}
            </p>
          </div>
        </div>
      </div>

      <div className="h-2 overflow-hidden rounded-full bg-[var(--bv-fog)]">
        <div
          className="h-full rounded-full bg-[var(--bv-teal)] transition-[width]"
          style={{
            width: `${grandTotal > 0 ? Math.min(100, (paidAmount / grandTotal) * 100) : 0}%`,
          }}
        />
      </div>

      {payments.length ? (
        <ul className="divide-y divide-[var(--bv-border)] rounded-[var(--radius-md)] border border-[var(--bv-border)]">
          {payments.map((payment) => (
            <li
              key={payment.id}
              className="flex items-start justify-between gap-3 px-3 py-2.5"
            >
              <div className="min-w-0">
                <p className="text-sm font-medium">
                  {formatCurrency(payment.amount)}
                  {payment.method ? (
                    <span className="text-[var(--bv-muted)]">
                      {" "}
                      · {payment.method}
                    </span>
                  ) : null}
                </p>
                <p className="text-xs text-[var(--bv-muted)]">
                  {new Date(payment.paidAt).toLocaleDateString("tr-TR")}
                  {payment.note ? ` · ${payment.note}` : ""}
                </p>
              </div>
              {!cancelled ? (
                <button
                  type="button"
                  disabled={pending}
                  onClick={() => onDelete(payment.id)}
                  className="rounded p-1.5 text-[var(--bv-muted)] hover:bg-[var(--bv-fog)] hover:text-[var(--bv-danger)]"
                  aria-label="Ödemeyi sil"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              ) : null}
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-[var(--bv-muted)]">Henüz ödeme kaydı yok.</p>
      )}

      {!cancelled && remaining > 0 ? (
        <form onSubmit={onSubmit} className="space-y-3 border-t border-[var(--bv-border)] pt-4">
          <p className="text-xs font-semibold tracking-wide text-[var(--bv-muted)] uppercase">
            Ödeme ekle
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            <Input
              label="Tutar"
              type="number"
              min={0.01}
              step="0.01"
              max={remaining}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              required
              inputMode="decimal"
            />
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-[var(--bv-ink)]">
                Yöntem
              </label>
              <select
                className="h-10 w-full rounded-[var(--radius-md)] border border-[var(--bv-border-strong)] bg-white px-3 text-sm"
                value={method}
                onChange={(e) => setMethod(e.target.value)}
              >
                {INVOICE_PAYMENT_METHODS.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </div>
            <Input
              label="Tarih"
              type="date"
              value={paidAt}
              onChange={(e) => setPaidAt(e.target.value)}
              required
            />
            <Input
              label="Not"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Opsiyonel"
            />
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Button
              type="button"
              variant="outline"
              className="w-full sm:w-auto"
              disabled={pending}
              onClick={() => setAmount(String(remaining))}
            >
              Kalanı doldur
            </Button>
            <Button type="submit" className="w-full sm:w-auto" disabled={pending}>
              <Plus className="h-4 w-4" />
              {pending ? "Kaydediliyor…" : "Ödeme kaydet"}
            </Button>
          </div>
        </form>
      ) : null}
    </div>
  );
}
