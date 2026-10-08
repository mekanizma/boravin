"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { updateCustomerDiscountPercent } from "@/features/admin/customer-actions";

export function CustomerDiscountInput({
  customerId,
  value,
}: {
  customerId: string;
  value: string | number | null;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const initial = Number(value ?? 0);
  const [draft, setDraft] = React.useState(String(initial));
  const [pending, setPending] = React.useState(false);
  const dirty = Number(draft.replace(",", ".")) !== initial;

  React.useEffect(() => {
    setDraft(String(Number(value ?? 0)));
  }, [value]);

  async function save() {
    const parsed = Number(draft.replace(",", "."));
    if (!Number.isFinite(parsed) || parsed < 0 || parsed > 100) {
      toast({
        title: "Geçersiz oran",
        description: "İndirim 0–100 arasında olmalıdır.",
        tone: "error",
      });
      return;
    }

    setPending(true);
    try {
      const result = await updateCustomerDiscountPercent({
        customerId,
        discountPercent: parsed,
      });
      if (!result.ok) {
        toast({
          title: "Kaydedilemedi",
          description: result.error,
          tone: "error",
        });
        return;
      }
      toast({
        title: parsed > 0 ? `%${parsed} indirim kaydedildi` : "İndirim kaldırıldı",
        tone: "success",
      });
      router.refresh();
    } catch {
      toast({ title: "Kaydedilemedi", tone: "error" });
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="flex min-w-[7.5rem] max-w-[10rem] items-center gap-1 sm:min-w-[8.5rem] sm:max-w-[11rem] sm:gap-1.5">
      <div className="relative flex-1">
        <input
          type="number"
          inputMode="decimal"
          min={0}
          max={100}
          step={0.5}
          value={draft}
          disabled={pending}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              void save();
            }
          }}
          aria-label="Müşteri indirim yüzdesi"
          className="h-10 w-full rounded-[var(--radius-md)] border border-[var(--bv-border-strong)] bg-white py-1.5 pr-7 pl-2 text-sm tabular-nums focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] disabled:opacity-50 sm:h-9"
        />
        <span
          className="pointer-events-none absolute top-1/2 right-2 -translate-y-1/2 text-xs text-[var(--bv-muted)]"
          aria-hidden
        >
          %
        </span>
      </div>
      <Button
        type="button"
        size="sm"
        variant={dirty ? "accent" : "secondary"}
        disabled={pending || !dirty}
        onClick={() => void save()}
        className="h-10 shrink-0 px-2 sm:h-8 sm:px-2.5"
      >
        {pending ? "…" : "OK"}
      </Button>
    </div>
  );
}
