"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { deleteProduct } from "@/features/products/actions";

export function ProductRowActions({
  id,
  name,
}: {
  id: string;
  name: string;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [pending, setPending] = React.useState(false);

  async function onDelete() {
    if (
      !window.confirm(
        `"${name}" ürününü silmek istediğinize emin misiniz? Bu işlem geri alınamaz.`,
      )
    ) {
      return;
    }
    setPending(true);
    try {
      const result = await deleteProduct(id);
      if (!result.ok) {
        toast({
          title: "Ürün silinemedi",
          description:
            result.error === "NOT_FOUND"
              ? "Ürün bulunamadı."
              : "Bağlı kayıtlar nedeniyle silinemedi.",
          tone: "error",
        });
        return;
      }
      toast({ title: "Ürün silindi", tone: "success" });
      router.refresh();
    } catch {
      toast({ title: "Ürün silinemedi", tone: "error" });
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="flex items-center justify-end gap-1">
      <Link href={`/admin/products/${id}`}>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-9 gap-1.5 px-2.5"
          aria-label={`${name} düzenle`}
        >
          <Pencil className="h-3.5 w-3.5" strokeWidth={1.75} />
          <span className="hidden sm:inline">Düzenle</span>
        </Button>
      </Link>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="h-9 px-2.5 text-[var(--bv-danger)] hover:bg-[#fff5f5] hover:text-[var(--bv-danger)]"
        disabled={pending}
        onClick={() => void onDelete()}
        aria-label={`${name} sil`}
      >
        <Trash2 className="h-3.5 w-3.5" strokeWidth={1.75} />
        <span className="hidden sm:inline">Sil</span>
      </Button>
    </div>
  );
}
