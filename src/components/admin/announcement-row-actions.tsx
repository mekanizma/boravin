"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { useToast } from "@/components/ui/toast";
import {
  deleteAnnouncement,
  setAnnouncementStatus,
  updateAnnouncement,
} from "@/features/admin/create-actions";

export type AnnouncementRow = {
  id: string;
  title: string;
  description: string | null;
  type: "top_bar" | "popup" | "homepage_banner" | "campaign_banner";
  status: string;
  priority: number;
  linkUrl: string | null;
  cta: string | null;
};

const TYPE_OPTIONS = [
  { value: "top_bar", label: "Üst bar" },
  { value: "popup", label: "Popup" },
  { value: "homepage_banner", label: "Anasayfa banner" },
  { value: "campaign_banner", label: "Kampanya banner" },
] as const;

export function AnnouncementRowActions({ row }: { row: AnnouncementRow }) {
  const router = useRouter();
  const { toast } = useToast();
  const [pending, setPending] = React.useState(false);
  const [editOpen, setEditOpen] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const isPublished = row.status === "published";

  async function runStatus(next: "published" | "draft") {
    setPending(true);
    try {
      const result = await setAnnouncementStatus(row.id, next);
      if (!result.ok) {
        toast({
          title:
            next === "published"
              ? "Yayına alınamadı"
              : "Yayından çıkarılamadı",
          description: result.error,
          tone: "error",
        });
        return;
      }
      toast({
        title: next === "published" ? "Duyuru yayında" : "Duyuru yayından alındı",
        tone: "success",
      });
      router.refresh();
    } catch {
      toast({ title: "İşlem başarısız", tone: "error" });
    } finally {
      setPending(false);
    }
  }

  async function onDelete() {
    if (
      !window.confirm(
        `"${row.title}" duyurusunu silmek istediğinize emin misiniz? Bu işlem geri alınamaz.`,
      )
    ) {
      return;
    }
    setPending(true);
    try {
      const result = await deleteAnnouncement(row.id);
      if (!result.ok) {
        toast({ title: "Duyuru silinemedi", description: result.error, tone: "error" });
        return;
      }
      toast({ title: "Duyuru silindi", tone: "success" });
      router.refresh();
    } catch {
      toast({ title: "Duyuru silinemedi", tone: "error" });
    } finally {
      setPending(false);
    }
  }

  async function onEditSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    setPending(true);
    setError(null);
    try {
      const result = await updateAnnouncement(row.id, {
        title: String(form.get("title") ?? ""),
        type: String(form.get("type") ?? row.type) as AnnouncementRow["type"],
        status: (String(form.get("status") ?? row.status) as
          | "draft"
          | "published") || "published",
        description: String(form.get("description") ?? "") || null,
        linkUrl: String(form.get("linkUrl") ?? "") || null,
        cta: String(form.get("cta") ?? "") || null,
        priority: Number(form.get("priority") ?? row.priority) || 0,
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      toast({ title: "Duyuru güncellendi", tone: "success" });
      setEditOpen(false);
      router.refresh();
    } catch {
      setError("Duyuru güncellenemedi.");
    } finally {
      setPending(false);
    }
  }

  return (
    <>
      <div className="flex flex-wrap items-center justify-end gap-1.5">
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-9 gap-1.5 px-2.5"
          disabled={pending}
          onClick={() => {
            setError(null);
            setEditOpen(true);
          }}
        >
          <Pencil className="h-3.5 w-3.5" strokeWidth={1.75} />
          <span className="hidden sm:inline">Düzenle</span>
        </Button>
        {isPublished ? (
          <Button
            type="button"
            variant="secondary"
            size="sm"
            className="h-9 gap-1.5 px-2.5"
            disabled={pending}
            onClick={() => void runStatus("draft")}
          >
            <EyeOff className="h-3.5 w-3.5" strokeWidth={1.75} />
            <span className="hidden sm:inline">Yayından çıkar</span>
          </Button>
        ) : (
          <Button
            type="button"
            variant="accent"
            size="sm"
            className="h-9 gap-1.5 px-2.5"
            disabled={pending}
            onClick={() => void runStatus("published")}
          >
            <Eye className="h-3.5 w-3.5" strokeWidth={1.75} />
            <span className="hidden sm:inline">Yayına al</span>
          </Button>
        )}
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-9 px-2.5 text-[var(--bv-danger)] hover:bg-[#fff5f5] hover:text-[var(--bv-danger)]"
          disabled={pending}
          onClick={() => void onDelete()}
          aria-label={`${row.title} sil`}
        >
          <Trash2 className="h-3.5 w-3.5" strokeWidth={1.75} />
          <span className="hidden sm:inline">Sil</span>
        </Button>
      </div>

      <Modal
        open={editOpen}
        onClose={() => !pending && setEditOpen(false)}
        title="Duyuruyu düzenle"
      >
        <form onSubmit={onEditSubmit} className="space-y-4">
          <Input
            name="title"
            label="Başlık"
            required
            defaultValue={row.title}
          />
          <label className="flex flex-col gap-1.5 text-sm font-medium">
            Tip
            <select
              name="type"
              required
              defaultValue={row.type}
              className="h-10 rounded-[var(--radius-md)] border border-[var(--bv-border-strong)] bg-white px-3 text-sm font-normal focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]"
            >
              {TYPE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1.5 text-sm font-medium">
            Durum
            <select
              name="status"
              defaultValue={
                row.status === "published" ? "published" : "draft"
              }
              className="h-10 rounded-[var(--radius-md)] border border-[var(--bv-border-strong)] bg-white px-3 text-sm font-normal focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]"
            >
              <option value="published">Yayında</option>
              <option value="draft">Taslak</option>
            </select>
          </label>
          <Input
            name="priority"
            label="Öncelik"
            type="number"
            inputMode="numeric"
            defaultValue={String(row.priority)}
          />
          <label className="flex flex-col gap-1.5 text-sm font-medium">
            Açıklama
            <textarea
              name="description"
              defaultValue={row.description ?? ""}
              rows={3}
              className="w-full rounded-[var(--radius-md)] border border-[var(--bv-border-strong)] bg-white px-3 py-2 text-sm font-normal placeholder:text-[var(--bv-muted)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]"
            />
          </label>
          <Input
            name="linkUrl"
            label="Link"
            placeholder="/urunler"
            defaultValue={row.linkUrl ?? ""}
          />
          <Input
            name="cta"
            label="Buton metni"
            placeholder="İncele"
            defaultValue={row.cta ?? ""}
          />
          {error ? (
            <p className="text-sm text-[var(--bv-danger)]" role="alert">
              {error}
            </p>
          ) : null}
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button
              type="button"
              variant="secondary"
              className="w-full sm:w-auto"
              disabled={pending}
              onClick={() => setEditOpen(false)}
            >
              İptal
            </Button>
            <Button
              type="submit"
              variant="accent"
              className="w-full sm:w-auto"
              disabled={pending}
            >
              {pending ? "Kaydediliyor…" : "Kaydet"}
            </Button>
          </div>
        </form>
      </Modal>
    </>
  );
}
