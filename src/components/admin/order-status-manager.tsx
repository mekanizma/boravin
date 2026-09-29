"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";
import { cn } from "@/lib/utils";
import { updateOrderStatus } from "@/features/orders/actions";
import {
  ORDER_FLOW,
  ORDER_STATUS_LABELS,
  allowedNextStatuses,
  orderStatusLabel,
  type OrderStatus,
} from "@/lib/orders/status";

const ACTION_LABELS: Partial<Record<OrderStatus, string>> = {
  accepted: "Siparişi kabul et",
  preparing: "Hazırlanıyor yap",
  shipped: "Gönderildi yap",
  delivered: "Teslim edildi yap",
  cancelled: "İptal et",
  returned: "İade kaydet",
};

export function OrderStatusManager({
  orderId,
  status,
  trackingNumber,
  shippingCarrier,
}: {
  orderId: string;
  status: string;
  trackingNumber?: string | null;
  shippingCarrier?: string | null;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [pending, setPending] = React.useState(false);
  const [note, setNote] = React.useState("");
  const [carrier, setCarrier] = React.useState(shippingCarrier ?? "");
  const [tracking, setTracking] = React.useState(trackingNumber ?? "");
  const [confirmCancel, setConfirmCancel] = React.useState(false);

  const next = allowedNextStatuses(status);
  const flowIndex = (() => {
    if (status === "awaiting_payment") return 0;
    const idx = ORDER_FLOW.indexOf(status as OrderStatus);
    return idx >= 0 ? idx : -1;
  })();

  async function apply(nextStatus: OrderStatus) {
    if (nextStatus === "cancelled" && !confirmCancel) {
      setConfirmCancel(true);
      return;
    }
    setPending(true);
    try {
      const result = await updateOrderStatus({
        orderId,
        status: nextStatus,
        note: note.trim() || null,
        trackingNumber: nextStatus === "shipped" ? tracking : null,
        shippingCarrier: nextStatus === "shipped" ? carrier : null,
      });
      if (!result.ok) {
        toast({
          tone: "error",
          title: "Durum güncellenemedi",
          description:
            result.error === "INVALID_TRANSITION"
              ? "Bu geçişe izin verilmiyor."
              : "Lütfen tekrar deneyin.",
        });
        return;
      }
      toast({
        tone: "success",
        title: "Sipariş güncellendi",
        description: orderStatusLabel(nextStatus),
      });
      setNote("");
      setConfirmCancel(false);
      router.refresh();
    } catch {
      toast({ tone: "error", title: "Durum güncellenemedi" });
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="space-y-4 rounded-[var(--radius-lg)] border border-[var(--bv-border)] bg-white p-4 sm:p-5">
      <div>
        <h2 className="text-sm font-semibold tracking-wide">Sipariş yönetimi</h2>
        <p className="mt-1 text-sm text-[var(--bv-muted)]">
          Güncel: <strong className="text-[var(--bv-ink)]">{orderStatusLabel(status)}</strong>
        </p>
      </div>

      <ol className="grid grid-cols-2 gap-2 sm:grid-cols-5">
        {ORDER_FLOW.map((step, index) => {
          const done = flowIndex > index;
          const current = flowIndex === index || (status === "awaiting_payment" && index === 0);
          return (
            <li
              key={step}
              className={cn(
                "rounded-[var(--radius-md)] border px-2 py-2 text-center text-[11px] font-semibold leading-tight sm:text-xs",
                current
                  ? "border-[var(--bv-ink)] bg-[var(--bv-ink)] text-white"
                  : done
                    ? "border-[var(--bv-teal)]/40 bg-[var(--bv-teal)]/10 text-[var(--bv-teal)]"
                    : "border-[var(--bv-border)] text-[var(--bv-muted)]",
              )}
            >
              {ORDER_STATUS_LABELS[step]}
            </li>
          );
        })}
      </ol>

      {next.includes("shipped") ? (
        <div className="grid gap-3 sm:grid-cols-2">
          <Input
            label="Kargo firması"
            value={carrier}
            onChange={(e) => setCarrier(e.target.value)}
            placeholder="Yurtiçi, MNG…"
          />
          <Input
            label="Takip numarası"
            value={tracking}
            onChange={(e) => setTracking(e.target.value)}
            placeholder="Opsiyonel"
          />
        </div>
      ) : null}

      <Input
        label="İşlem notu (isteğe bağlı)"
        value={note}
        onChange={(e) => setNote(e.target.value)}
        placeholder="Örn. müşteri bilgilendirildi"
      />

      {next.length === 0 ? (
        <p className="text-sm text-[var(--bv-muted)]">
          Bu sipariş için başka durum geçişi yok.
        </p>
      ) : (
        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
          {next.map((step) => {
            const isCancel = step === "cancelled";
            return (
              <Button
                key={step}
                type="button"
                disabled={pending}
                variant={
                  isCancel
                    ? confirmCancel
                      ? "danger"
                      : "outline"
                    : step === "accepted" || step === "delivered"
                      ? "accent"
                      : "primary"
                }
                className="w-full sm:w-auto"
                onClick={() => apply(step)}
              >
                {isCancel && confirmCancel
                  ? "İptali onayla"
                  : ACTION_LABELS[step] ?? ORDER_STATUS_LABELS[step]}
              </Button>
            );
          })}
          {confirmCancel ? (
            <Button
              type="button"
              variant="ghost"
              className="w-full sm:w-auto"
              disabled={pending}
              onClick={() => setConfirmCancel(false)}
            >
              Vazgeç
            </Button>
          ) : null}
        </div>
      )}
    </div>
  );
}
