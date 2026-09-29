"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";
import { cn } from "@/lib/utils";
import { submitProductReview } from "@/features/reviews/actions";

export function ProductReviewForm({
  productId,
  defaultName,
}: {
  productId: string;
  defaultName?: string;
}) {
  const t = useTranslations("Reviews");
  const tToasts = useTranslations("Toasts");
  const router = useRouter();
  const { toast } = useToast();
  const [saving, setSaving] = React.useState(false);
  const [authorName, setAuthorName] = React.useState(defaultName ?? "");
  const [rating, setRating] = React.useState(5);
  const [title, setTitle] = React.useState("");
  const [body, setBody] = React.useState("");

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const result = await submitProductReview({
        productId,
        authorName,
        rating,
        title: title || null,
        body,
      });
      if (!result.ok) {
        toast({
          tone: "error",
          title: tToasts("reviewFailed"),
          description:
            result.error === "VALIDATION"
              ? tToasts("reviewValidation")
              : tToasts("reviewRetry"),
        });
        return;
      }
      toast({
        tone: "success",
        title: tToasts("reviewReceived"),
        description: tToasts("reviewPending"),
      });
      setTitle("");
      setBody("");
      setRating(5);
      router.refresh();
    } catch {
      toast({ tone: "error", title: tToasts("reviewFailed") });
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-3">
      <p className="text-sm text-[var(--bv-muted)]">{t("moderationNote")}</p>
      <div className="flex flex-wrap items-center gap-1" role="radiogroup" aria-label={t("ratingAria")}>
        {[1, 2, 3, 4, 5].map((value) => (
          <button
            key={value}
            type="button"
            role="radio"
            aria-checked={rating === value}
            onClick={() => setRating(value)}
            className="rounded p-1.5 hover:bg-[var(--bv-fog)]"
            aria-label={t("starAria", { value })}
          >
            <Star
              className={cn(
                "h-5 w-5",
                value <= rating
                  ? "fill-[var(--bv-sale)] text-[var(--bv-sale)]"
                  : "text-[var(--bv-border-strong)]",
              )}
            />
          </button>
        ))}
      </div>
      <Input
        label={t("name")}
        value={authorName}
        onChange={(e) => setAuthorName(e.target.value)}
        required
        autoComplete="name"
      />
      <Input
        label={t("titleOptional")}
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        maxLength={180}
      />
      <div className="flex flex-col gap-1.5">
        <label
          htmlFor={`review-body-${productId}`}
          className="text-sm font-medium text-[var(--bv-ink)]"
        >
          {t("body")}
        </label>
        <textarea
          id={`review-body-${productId}`}
          value={body}
          onChange={(e) => setBody(e.target.value)}
          required
          minLength={10}
          maxLength={2000}
          rows={4}
          className="w-full rounded-[var(--radius-md)] border border-[var(--bv-border-strong)] bg-white px-3 py-2 text-sm text-[var(--bv-ink)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]"
          placeholder={t("bodyPlaceholder")}
        />
      </div>
      <Button type="submit" disabled={saving} className="w-full sm:w-auto">
        {saving ? t("submitting") : t("submit")}
      </Button>
    </form>
  );
}
