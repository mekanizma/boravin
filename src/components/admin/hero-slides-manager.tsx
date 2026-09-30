"use client";

import * as React from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import {
  ArrowDown,
  ArrowUp,
  Pencil,
  Plus,
  Trash2,
  Wand2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { useToast } from "@/components/ui/toast";
import {
  deleteHeroSlide,
  moveHeroSlide,
  saveHeroSlide,
  seedDefaultHeroSlides,
  uploadHeroImage,
  type HeroSlide,
} from "@/features/homepage/actions";

type Draft = {
  id?: string;
  eyebrow: string;
  title: string;
  body: string;
  imageUrl: string;
  linkUrl: string;
  buttonLabel: string;
};

const emptyDraft = (): Draft => ({
  eyebrow: "",
  title: "",
  body: "",
  imageUrl: "",
  linkUrl: "",
  buttonLabel: "Alışverişe başla",
});

export function HeroSlidesManager({ slides }: { slides: HeroSlide[] }) {
  const router = useRouter();
  const { toast } = useToast();
  const [open, setOpen] = React.useState(false);
  const [pending, setPending] = React.useState(false);
  const [uploading, setUploading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [draft, setDraft] = React.useState<Draft>(emptyDraft);
  const [localPreview, setLocalPreview] = React.useState<string | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    return () => {
      if (localPreview) URL.revokeObjectURL(localPreview);
    };
  }, [localPreview]);

  function clearLocalPreview() {
    setLocalPreview((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return null;
    });
  }

  function openCreate() {
    clearLocalPreview();
    setDraft(emptyDraft());
    setError(null);
    setOpen(true);
  }

  function openEdit(slide: HeroSlide) {
    clearLocalPreview();
    setDraft({
      id: slide.id,
      eyebrow: slide.eyebrow,
      title: slide.title,
      body: slide.body,
      imageUrl: slide.imageUrl,
      linkUrl: slide.linkUrl,
      buttonLabel: slide.buttonLabel,
    });
    setError(null);
    setOpen(true);
  }

  async function onPickFile(file: File | null) {
    if (!file) return;
    setError(null);
    clearLocalPreview();
    setLocalPreview(URL.createObjectURL(file));
    setUploading(true);
    try {
      const body = new FormData();
      body.set("file", file);
      const result = await uploadHeroImage(body);
      if (!result.ok) {
        setError(result.error);
        clearLocalPreview();
        return;
      }
      setDraft((d) => ({ ...d, imageUrl: result.url }));
      toast({ tone: "success", title: "Görsel yüklendi" });
    } catch {
      setError("Görsel yüklenemedi.");
      clearLocalPreview();
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  async function onSave(e: React.FormEvent) {
    e.preventDefault();
    if (!draft.imageUrl.trim()) {
      setError("Bilgisayardan görsel yükleyin veya bir URL girin.");
      return;
    }
    setPending(true);
    setError(null);
    try {
      const result = await saveHeroSlide(draft);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      toast({
        tone: "success",
        title: draft.id ? "Slayt güncellendi" : "Slayt eklendi",
      });
      clearLocalPreview();
      setOpen(false);
      router.refresh();
    } catch {
      setError("Kayıt başarısız.");
    } finally {
      setPending(false);
    }
  }

  async function onDelete(id: string) {
    if (!window.confirm("Bu hero slaytı silinsin mi?")) return;
    setPending(true);
    try {
      const result = await deleteHeroSlide(id);
      if (!result.ok) {
        toast({ tone: "error", title: result.error });
        return;
      }
      toast({ tone: "success", title: "Slayt silindi" });
      router.refresh();
    } finally {
      setPending(false);
    }
  }

  async function onMove(id: string, direction: "up" | "down") {
    setPending(true);
    try {
      const result = await moveHeroSlide(id, direction);
      if (!result.ok) {
        toast({ tone: "error", title: result.error });
        return;
      }
      router.refresh();
    } finally {
      setPending(false);
    }
  }

  async function onSeed() {
    setPending(true);
    try {
      const result = await seedDefaultHeroSlides();
      if (!result.ok) {
        toast({ tone: "error", title: result.error });
        return;
      }
      toast({ tone: "success", title: "Varsayılan 3 slayt eklendi" });
      router.refresh();
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h1 className="font-display text-2xl font-semibold">Anasayfa Hero</h1>
          <p className="mt-1 text-sm text-[var(--bv-muted)]">
            Ana sayfadaki büyük görsel alanı (slider). Görsel, başlık ve linkleri
            buradan değiştirin.
          </p>
        </div>
        <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
          {slides.length === 0 ? (
            <Button
              variant="secondary"
              className="w-full sm:w-auto"
              disabled={pending}
              onClick={onSeed}
            >
              <Wand2 className="mr-1.5 h-4 w-4" />
              Varsayılan 3 slayt
            </Button>
          ) : null}
          <Button
            variant="accent"
            className="w-full sm:w-auto"
            disabled={pending}
            onClick={openCreate}
          >
            <Plus className="mr-1.5 h-4 w-4" />
            Slayt ekle
          </Button>
        </div>
      </div>

      {slides.length === 0 ? (
        <div className="rounded-[var(--radius-md)] border border-dashed border-[var(--bv-border-strong)] bg-white px-4 py-10 text-center text-sm text-[var(--bv-muted)]">
          Henüz hero slaytı yok. Varsayılanları yükleyin veya yeni slayt ekleyin.
        </div>
      ) : (
        <ul className="space-y-3">
          {slides.map((slide, index) => (
            <li
              key={slide.id}
              className="overflow-hidden rounded-[var(--radius-md)] border border-[var(--bv-border)] bg-white"
            >
              <div className="flex flex-col sm:flex-row">
                <div className="relative aspect-[16/10] w-full shrink-0 bg-[#121417] sm:aspect-auto sm:h-auto sm:w-44">
                  {slide.imageUrl ? (
                    <Image
                      src={slide.imageUrl}
                      alt=""
                      fill
                      unoptimized
                      className="object-cover"
                      sizes="(max-width: 640px) 100vw, 176px"
                    />
                  ) : (
                    <div className="flex h-full min-h-28 items-center justify-center text-xs text-white/50">
                      Görsel yok
                    </div>
                  )}
                </div>
                <div className="flex min-w-0 flex-1 flex-col gap-3 p-4">
                  <div className="min-w-0">
                    {slide.eyebrow ? (
                      <p className="text-[11px] font-semibold tracking-[0.14em] text-[var(--bv-sale)] uppercase">
                        {slide.eyebrow}
                      </p>
                    ) : null}
                    <p className="truncate text-sm font-semibold text-[#111]">
                      {slide.title || "Başlıksız slayt"}
                    </p>
                    {slide.body ? (
                      <p className="mt-1 line-clamp-2 text-xs text-[var(--bv-muted)]">
                        {slide.body}
                      </p>
                    ) : null}
                    <p className="mt-2 truncate text-[11px] text-[var(--bv-muted)]">
                      {slide.linkUrl || "Link yok"}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      disabled={pending || index === 0}
                      onClick={() => onMove(slide.id, "up")}
                      aria-label="Yukarı taşı"
                    >
                      <ArrowUp className="h-4 w-4" />
                    </Button>
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      disabled={pending || index === slides.length - 1}
                      onClick={() => onMove(slide.id, "down")}
                      aria-label="Aşağı taşı"
                    >
                      <ArrowDown className="h-4 w-4" />
                    </Button>
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      disabled={pending}
                      onClick={() => openEdit(slide)}
                    >
                      <Pencil className="mr-1 h-3.5 w-3.5" />
                      Düzenle
                    </Button>
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      disabled={pending}
                      onClick={() => onDelete(slide.id)}
                    >
                      <Trash2 className="mr-1 h-3.5 w-3.5" />
                      Sil
                    </Button>
                  </div>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}

      <Modal
        open={open}
        onClose={() => {
          if (pending || uploading) return;
          clearLocalPreview();
          setOpen(false);
        }}
        title={draft.id ? "Slaytı düzenle" : "Yeni hero slayt"}
      >
        <form onSubmit={onSave} className="space-y-4">
          <div className="space-y-3">
            <p className="text-sm font-medium">Görsel</p>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              className="sr-only"
              onChange={(e) => onPickFile(e.target.files?.[0] ?? null)}
            />
            <div className="flex flex-col gap-2 sm:flex-row">
              <Button
                type="button"
                variant="accent"
                className="w-full sm:w-auto"
                disabled={pending || uploading}
                onClick={() => fileInputRef.current?.click()}
              >
                {uploading ? "Yükleniyor…" : "Bilgisayardan seç"}
              </Button>
              {draft.imageUrl || localPreview ? (
                <Button
                  type="button"
                  variant="secondary"
                  className="w-full sm:w-auto"
                  disabled={pending || uploading}
                  onClick={() => {
                    clearLocalPreview();
                    setDraft((d) => ({ ...d, imageUrl: "" }));
                  }}
                >
                  Görseli kaldır
                </Button>
              ) : null}
            </div>
            <label className="flex flex-col gap-1.5 text-sm font-medium">
              veya görsel URL
              <Input
                type="url"
                value={draft.imageUrl.startsWith("/uploads/") ? "" : draft.imageUrl}
                onChange={(e) => {
                  clearLocalPreview();
                  setDraft((d) => ({ ...d, imageUrl: e.target.value }));
                }}
                placeholder="https://…"
                disabled={uploading}
              />
              <span className="text-xs font-normal text-[var(--bv-muted)]">
                JPG, PNG, WEBP veya GIF · en fazla 6 MB · en iyi oturuş için ~21:9
                (geniş banner); görsel kırpılmadan alana sığdırılır
              </span>
            </label>
            {draft.imageUrl.startsWith("/uploads/") ? (
              <p className="truncate text-xs text-[var(--bv-muted)]">
                Yüklendi: {draft.imageUrl}
              </p>
            ) : null}
          </div>
          <label className="flex flex-col gap-1.5 text-sm font-medium">
            Üst etiket (eyebrow)
            <Input
              value={draft.eyebrow}
              onChange={(e) =>
                setDraft((d) => ({ ...d, eyebrow: e.target.value }))
              }
              placeholder="Hazır sistemler"
              maxLength={80}
            />
          </label>
          <label className="flex flex-col gap-1.5 text-sm font-medium">
            Başlık
            <Input
              value={draft.title}
              onChange={(e) =>
                setDraft((d) => ({ ...d, title: e.target.value }))
              }
              placeholder="Seçilmiş sistemler, net fiyat"
              maxLength={200}
            />
          </label>
          <label className="flex flex-col gap-1.5 text-sm font-medium">
            Açıklama
            <textarea
              value={draft.body}
              onChange={(e) => setDraft((d) => ({ ...d, body: e.target.value }))}
              rows={3}
              maxLength={500}
              className="w-full rounded-[var(--radius-md)] border border-[var(--bv-border-strong)] bg-white px-3 py-2 text-sm font-normal placeholder:text-[var(--bv-muted)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]"
              placeholder="Kısa açıklama metni"
            />
          </label>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="flex flex-col gap-1.5 text-sm font-medium">
              Link (opsiyonel)
              <Input
                value={draft.linkUrl}
                onChange={(e) =>
                  setDraft((d) => ({ ...d, linkUrl: e.target.value }))
                }
                placeholder="/urunler"
              />
            </label>
            <label className="flex flex-col gap-1.5 text-sm font-medium">
              Buton yazısı
              <Input
                value={draft.buttonLabel}
                onChange={(e) =>
                  setDraft((d) => ({ ...d, buttonLabel: e.target.value }))
                }
                placeholder="Alışverişe başla"
                maxLength={80}
              />
            </label>
          </div>
          {localPreview || draft.imageUrl ? (
            <div className="relative aspect-[16/9] overflow-hidden rounded-[var(--radius-md)] bg-[#121417]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={localPreview || draft.imageUrl}
                alt=""
                className="absolute inset-0 h-full w-full object-cover opacity-80"
              />
            </div>
          ) : null}
          {error ? (
            <p className="text-sm text-[var(--bv-sale)]">{error}</p>
          ) : null}
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button
              type="button"
              variant="secondary"
              className="w-full sm:w-auto"
              disabled={pending || uploading}
              onClick={() => {
                clearLocalPreview();
                setOpen(false);
              }}
            >
              Vazgeç
            </Button>
            <Button
              type="submit"
              variant="accent"
              className="w-full sm:w-auto"
              disabled={pending || uploading}
            >
              {pending ? "Kaydediliyor…" : "Kaydet"}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
