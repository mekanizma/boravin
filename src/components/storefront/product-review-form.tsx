"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
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
          title: "Yorum gönderilemedi",
          description:
            result.error === "VALIDATION"
              ? "Ad, puan ve en az 10 karakter yorum girin."
              : "Lütfen tekrar deneyin.",
        });
        return;
      }
      toast({
        tone: "success",
        title: "Yorumunuz alındı",
        description: "Yayınlanmadan önce admin onayı bekliyor.",
      });
      setTitle("");
      setBody("");
      setRating(5);
      router.refresh();
    } catch {
      toast({ tone: "error", title: "Yorum gönderilemedi" });
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-3">
      <p className="text-sm text-[var(--bv-muted)]">
        Yorumunuz admin onayından sonra yayınlanır.
      </p>
      <div className="flex flex-wrap items-center gap-1" role="radiogroup" aria-label="Puan">
        {[1, 2, 3, 4, 5].map((value) => (
          <button
            key={value}
            type="button"
            role="radio"
            aria-checked={rating === value}
            onClick={() => setRating(value)}
            className="rounded p-1.5 hover:bg-[var(--bv-fog)]"
            aria-label={`${value} yıldız`}
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
        label="Adınız"
        value={authorName}
        onChange={(e) => setAuthorName(e.target.value)}
        required
        autoComplete="name"
      />
      <Input
        label="Başlık (isteğe bağlı)"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        maxLength={180}
      />
      <div className="flex flex-col gap-1.5">
        <label
          htmlFor={`review-body-${productId}`}
          className="text-sm font-medium text-[var(--bv-ink)]"
        >
          Yorumunuz
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
          placeholder="Ürün hakkında deneyiminizi yazın…"
        />
      </div>
      <Button type="submit" disabled={saving} className="w-full sm:w-auto">
        {saving ? "Gönderiliyor…" : "Yorum gönder"}
      </Button>
    </form>
  );
}
