"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Check, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import {
  approveReview,
  deleteReview,
  rejectReview,
} from "@/features/reviews/actions";

export function ReviewModerationActions({
  id,
  status,
}: {
  id: string;
  status: string;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [pending, setPending] = React.useState(false);

  async function run(
    action: "approve" | "reject" | "delete",
  ) {
    setPending(true);
    try {
      if (action === "delete") {
        if (!window.confirm("Bu yorumu silmek istediğinize emin misiniz?")) {
          return;
        }
        const result = await deleteReview(id);
        if (!result.ok) {
          toast({ title: "Yorum silinemedi", tone: "error" });
          return;
        }
        toast({ title: "Yorum silindi", tone: "success" });
      } else if (action === "approve") {
        const result = await approveReview(id);
        if (!result.ok) {
          toast({ title: "Onaylanamadı", tone: "error" });
          return;
        }
        toast({ title: "Yorum yayınlandı", tone: "success" });
      } else {
        const result = await rejectReview(id);
        if (!result.ok) {
          toast({ title: "Reddedilemedi", tone: "error" });
          return;
        }
        toast({ title: "Yorum reddedildi", tone: "success" });
      }
      router.refresh();
    } catch {
      toast({ title: "İşlem başarısız", tone: "error" });
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {status !== "approved" ? (
        <Button
          type="button"
          size="sm"
          variant="accent"
          disabled={pending}
          onClick={() => run("approve")}
        >
          <Check className="h-3.5 w-3.5" />
          Onayla
        </Button>
      ) : null}
      {status !== "rejected" ? (
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={pending}
          onClick={() => run("reject")}
        >
          <X className="h-3.5 w-3.5" />
          Reddet
        </Button>
      ) : null}
      <Button
        type="button"
        size="sm"
        variant="ghost"
        disabled={pending}
        onClick={() => run("delete")}
        aria-label="Yorumu sil"
      >
        <Trash2 className="h-3.5 w-3.5" />
      </Button>
    </div>
  );
}
