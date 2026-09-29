"use client";

import { useRouter } from "next/navigation";
import { Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import {
  cancelInvoice,
  issueInvoice,
  updateInvoicePaymentStatus,
} from "@/features/invoices/actions";

export function InvoiceActions({
  id,
  status,
  paymentStatus,
  printHref,
}: {
  id: string;
  status: "draft" | "issued" | "cancelled";
  paymentStatus: string | null;
  printHref: string;
}) {
  const router = useRouter();
  const { toast } = useToast();

  async function onIssue() {
    const result = await issueInvoice(id);
    if (!result.ok) {
      toast({ title: "Belge kesilemedi", tone: "error" });
      return;
    }
    toast({ title: "Belge kesildi", tone: "success" });
    router.refresh();
  }

  async function onCancel() {
    if (!window.confirm("Bu belgeyi iptal etmek istediğinize emin misiniz?")) {
      return;
    }
    const result = await cancelInvoice(id);
    if (!result.ok) {
      toast({ title: "İptal edilemedi", tone: "error" });
      return;
    }
    toast({ title: "Belge iptal edildi", tone: "success" });
    router.refresh();
  }

  async function onPayment(next: "unpaid" | "partial" | "paid") {
    await updateInvoicePaymentStatus(id, next);
    toast({ title: "Ödeme durumu güncellendi", tone: "success" });
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
      <a href={printHref} target="_blank" rel="noreferrer" className="contents">
        <Button variant="accent" className="w-full sm:w-auto">
          <Printer className="h-4 w-4" />
          Yazdır / PDF
        </Button>
      </a>
      {status === "draft" ? (
        <Button
          variant="primary"
          className="w-full sm:w-auto"
          onClick={onIssue}
        >
          Belgeyi kes
        </Button>
      ) : null}
      {status !== "cancelled" ? (
        <Button
          variant="outline"
          className="w-full sm:w-auto"
          onClick={onCancel}
        >
          İptal et
        </Button>
      ) : null}
      {status !== "cancelled" ? (
        <select
          className="h-10 w-full rounded-[var(--radius-md)] border border-[var(--bv-border-strong)] bg-white px-3 text-sm sm:w-auto"
          value={paymentStatus ?? "unpaid"}
          onChange={(e) =>
            onPayment(e.target.value as "unpaid" | "partial" | "paid")
          }
          aria-label="Ödeme durumu"
        >
          <option value="unpaid">Ödenmedi</option>
          <option value="partial">Kısmi</option>
          <option value="paid">Ödendi</option>
        </select>
      ) : null}
    </div>
  );
}

export function PrintToolbar() {
  return (
    <div className="print:hidden mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-sm text-[var(--bv-muted)]">
        Yazdırırken yalnızca belge görünür. PDF için yazdır penceresinden “PDF
        olarak kaydet” seçin.
      </p>
      <Button variant="accent" onClick={() => window.print()} className="w-full sm:w-auto">
        <Printer className="h-4 w-4" />
        Yazdır
      </Button>
    </div>
  );
}
