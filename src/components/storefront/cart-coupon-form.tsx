"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Ticket, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { applyCoupon, removeCoupon } from "@/features/cart/actions";

export function CartCouponForm({
  couponCode,
}: {
  couponCode?: string | null;
}) {
  const t = useTranslations("Cart");
  const router = useRouter();
  const { toast } = useToast();
  const [code, setCode] = React.useState("");
  const [pending, setPending] = React.useState(false);

  async function onApply(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = code.trim();
    if (!trimmed) return;
    setPending(true);
    try {
      const result = await applyCoupon(trimmed);
      if (!result.ok) {
        toast({
          title: t("couponErrorTitle"),
          description: result.error,
          tone: "error",
        });
        return;
      }
      toast({ title: t("couponApplied"), tone: "success" });
      setCode("");
      router.refresh();
    } catch {
      toast({ title: t("couponErrorTitle"), tone: "error" });
    } finally {
      setPending(false);
    }
  }

  async function onRemove() {
    setPending(true);
    try {
      const result = await removeCoupon();
      if (!result.ok) {
        toast({ title: t("couponRemoveError"), tone: "error" });
        return;
      }
      toast({ title: t("couponRemoved"), tone: "success" });
      router.refresh();
    } catch {
      toast({ title: t("couponRemoveError"), tone: "error" });
    } finally {
      setPending(false);
    }
  }

  if (couponCode) {
    return (
      <div className="mt-4 rounded-[var(--radius-md)] border border-[var(--bv-border)] bg-[var(--bv-fog)]/60 px-3 py-2.5">
        <div className="flex items-center justify-between gap-2">
          <p className="inline-flex min-w-0 items-center gap-2 text-sm font-medium">
            <Ticket className="h-4 w-4 shrink-0 text-[var(--bv-sale)]" />
            <span className="truncate">{t("couponAppliedCode", { code: couponCode })}</span>
          </p>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-8 shrink-0 px-2"
            disabled={pending}
            onClick={() => void onRemove()}
            aria-label={t("couponRemove")}
          >
            <X className="h-4 w-4" />
            <span className="hidden sm:inline">{t("couponRemove")}</span>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={onApply} className="mt-4 space-y-2">
      <label htmlFor="bv-coupon-code" className="text-sm font-medium">
        {t("couponLabel")}
      </label>
      <div className="flex flex-col gap-2 sm:flex-row">
        <input
          id="bv-coupon-code"
          name="code"
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase())}
          placeholder={t("couponPlaceholder")}
          autoComplete="off"
          className="h-10 min-w-0 flex-1 rounded-[var(--radius-md)] border border-[var(--bv-border-strong)] bg-white px-3 text-sm uppercase outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]"
        />
        <Button
          type="submit"
          variant="secondary"
          className="h-10 w-full shrink-0 sm:w-auto"
          disabled={pending || !code.trim()}
        >
          {pending ? t("couponApplying") : t("couponApply")}
        </Button>
      </div>
    </form>
  );
}
