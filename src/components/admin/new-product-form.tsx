"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Camera, ScanBarcode, Sparkles, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";
import {
  createProductFromBarcodeAction,
  lookupBarcodeAction,
} from "@/features/products/barcode-actions";
import type { ProductDraft } from "@/lib/barcode/types";

type CategoryOption = { id: string; label: string };
type BrandOption = { id: string; name: string };

type DetectedBarcode = { rawValue?: string };
type BarcodeDetectorInstance = {
  detect: (source: CanvasImageSource) => Promise<DetectedBarcode[]>;
};
type BarcodeDetectorCtor = {
  new (options?: { formats?: string[] }): BarcodeDetectorInstance;
};

const fieldClass =
  "h-12 w-full rounded-[var(--radius-md)] border border-[var(--bv-border-strong)] bg-white px-3 text-base text-[var(--bv-ink)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]";

const LOOKUP_STEPS = [
  "Kataloglar taranıyor",
  "Web kaynakları kontrol ediliyor",
  "Gemini ürün bilgisi hazırlıyor",
  "Sonuçlar düzenleniyor",
] as const;

function BarcodeLookupLoading({ barcode }: { barcode: string }) {
  const [step, setStep] = React.useState(0);

  React.useEffect(() => {
    setStep(0);
    const timers = [
      window.setTimeout(() => setStep(1), 900),
      window.setTimeout(() => setStep(2), 2200),
      window.setTimeout(() => setStep(3), 4500),
    ];
    return () => timers.forEach((id) => window.clearTimeout(id));
  }, [barcode]);

  return (
    <div
      className="bv-barcode-loading-backdrop"
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <div className="bv-barcode-loading-card">
        <div className="bv-barcode-loading-orb" aria-hidden>
          <Sparkles className="h-6 w-6" strokeWidth={1.75} />
        </div>
        <p className="mt-4 text-center text-[11px] font-semibold tracking-[0.16em] text-[var(--bv-muted)] uppercase">
          Ürün bilgisi
        </p>
        <h2 className="mt-1 text-center font-display text-xl font-semibold tracking-tight text-[var(--bv-ink)]">
          Barkod aranıyor
        </h2>
        <p className="mt-1.5 text-center font-mono text-sm tabular-nums text-[var(--bv-slate)]">
          {barcode}
        </p>
        <div className="bv-barcode-loading-progress" aria-hidden>
          <span />
        </div>
        <ul className="bv-barcode-loading-steps">
          {LOOKUP_STEPS.map((label, index) => {
            const state =
              index < step ? "done" : index === step ? "active" : "pending";
            return (
              <li
                key={label}
                className="bv-barcode-loading-step"
                data-state={state}
              >
                <span className="bv-barcode-loading-dot" aria-hidden />
                <span>{label}</span>
              </li>
            );
          })}
        </ul>
        <p className="mt-4 text-center text-[12px] text-[var(--bv-muted)]">
          Icecat, açık kataloglar ve Gemini paralel sorgulanıyor…
        </p>
      </div>
    </div>
  );
}

export function NewProductForm({
  categories,
  brands,
}: {
  categories: CategoryOption[];
  brands: BrandOption[];
}) {
  const router = useRouter();
  const { toast } = useToast();
  const barcodeRef = React.useRef<HTMLInputElement>(null);
  const videoRef = React.useRef<HTMLVideoElement>(null);
  const streamRef = React.useRef<MediaStream | null>(null);
  const requestRef = React.useRef(0);
  const lastLookup = React.useRef("");

  const [barcode, setBarcode] = React.useState("");
  const [looking, setLooking] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [cameraOpen, setCameraOpen] = React.useState(false);
  const [draft, setDraft] = React.useState<ProductDraft | null>(null);
  const [existingId, setExistingId] = React.useState<string | null>(null);
  const [existingLabel, setExistingLabel] = React.useState("");
  const [notice, setNotice] = React.useState<string | null>(null);
  const [categoryHint, setCategoryHint] = React.useState("");

  const [name, setName] = React.useState("");
  const [sku, setSku] = React.useState("");
  const [brandId, setBrandId] = React.useState("");
  const [brandName, setBrandName] = React.useState("");
  const [categoryId, setCategoryId] = React.useState("");
  const [shortDescription, setShortDescription] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [price, setPrice] = React.useState("");
  const [compareAtPrice, setCompareAtPrice] = React.useState("");
  const [stock, setStock] = React.useState("");
  const [remoteImages, setRemoteImages] = React.useState<string[]>([]);
  const [files, setFiles] = React.useState<File[]>([]);
  const [filePreviews, setFilePreviews] = React.useState<string[]>([]);
  const [specs, setSpecs] = React.useState<Record<string, string>>({});
  const previewsRef = React.useRef<string[]>([]);
  previewsRef.current = filePreviews;

  React.useEffect(() => {
    barcodeRef.current?.focus();
    return () => {
      streamRef.current?.getTracks().forEach((track) => track.stop());
      previewsRef.current.forEach((url) => URL.revokeObjectURL(url));
    };
  }, []);

  const stopCamera = React.useCallback(() => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    setCameraOpen(false);
  }, []);

  const applyLookup = React.useCallback(async (raw: string) => {
    const digits = raw.replace(/\D/g, "");
    if (![8, 12, 13, 14].includes(digits.length)) {
      setNotice("Barkod 8, 12, 13 veya 14 haneli olmalı.");
      return;
    }
    const requestId = ++requestRef.current;
    lastLookup.current = digits;
    setLooking(true);
    setNotice(null);
    setExistingId(null);
    try {
      const result = await Promise.race([
        lookupBarcodeAction(digits),
        new Promise<null>((resolve) => setTimeout(() => resolve(null), 16000)),
      ]);
      if (requestId !== requestRef.current) return;
      if (!result) {
        setNotice("Arama zaman aşımına uğradı. Tekrar deneyin veya bilgileri elle girin.");
        return;
      }
      if (!result.ok) {
        setNotice(result.message);
        return;
      }
      setBarcode(result.barcode);
      if (result.existing) {
        setDraft(null);
        setExistingId(result.existing.id);
        setExistingLabel(`${result.existing.name} · ${result.existing.sku}`);
        setNotice("Bu barkod sistemde kayıtlı. Yeni kayıt açılmadı.");
        return;
      }
      setExistingLabel("");
      if (!result.draft) {
        setDraft(null);
        setName("");
        setSku(result.barcode);
        setBrandId("");
        setBrandName("");
        setCategoryId("");
        setCategoryHint("");
        setShortDescription("");
        setDescription("");
        setRemoteImages([]);
        setSpecs({});
        setNotice(
          result.offline
            ? "Ürün kataloğuna şu an ulaşılamadı. Bilgileri siz girin."
            : "Bu barkod kataloglarda ve web aramasında bulunamadı. Ürün adı, açıklama ve görseli siz girin.",
        );
        return;
      }
      setDraft(result.draft);
      setName(result.draft.name);
      setSku(result.draft.sku);
      setBrandId(result.matchedBrandId ?? "");
      setBrandName(result.matchedBrandId ? "" : result.draft.brand);
      setCategoryId(result.matchedCategoryId ?? "");
      setCategoryHint(result.draft.categoryHint);
      setShortDescription(result.draft.shortDescription);
      setDescription(result.draft.description);
      setRemoteImages(result.draft.imageUrls);
      setSpecs(result.draft.specs);
      const gaps = [...result.draft.missing];
      setNotice(
        gaps.length
          ? `${result.draft.sourceLabel} kaydı geldi. Eksik: ${gaps.join(", ")}. Fiyat ve stok her zaman sizde.`
          : `${result.draft.sourceLabel} kaydı geldi. Fiyat ve stoğu girip onaylayın.`,
      );
    } catch {
      if (requestId !== requestRef.current) return;
      setNotice("Sorgu tamamlanamadı. Tekrar deneyin veya bilgileri elle girin.");
    } finally {
      if (requestId === requestRef.current) setLooking(false);
    }
  }, []);

  React.useEffect(() => {
    const digits = barcode.replace(/\D/g, "");
    if (![8, 12, 13, 14].includes(digits.length)) return;
    if (lastLookup.current === digits) return;
    const timer = window.setTimeout(() => {
      void applyLookup(digits);
    }, 280);
    return () => window.clearTimeout(timer);
  }, [applyLookup, barcode]);

  React.useEffect(() => {
    if (!cameraOpen) return;
    const video = videoRef.current;
    const stream = streamRef.current;
    const Detector = (
      window as Window & { BarcodeDetector?: BarcodeDetectorCtor }
    ).BarcodeDetector;
    if (!video || !stream || !Detector) return;
    video.srcObject = stream;
    void video.play().catch(() => undefined);
    let detector: BarcodeDetectorInstance;
    try {
      detector = new Detector({
        formats: ["ean_13", "ean_8", "upc_a", "upc_e", "code_128", "code_39"],
      });
    } catch {
      detector = new Detector();
    }
    let stopped = false;
    const timer = window.setInterval(() => {
      if (stopped || video.readyState < 2) return;
      void detector
        .detect(video)
        .then((codes) => {
          const value = codes.find((code) => code.rawValue)?.rawValue;
          if (!value || stopped) return;
          stopped = true;
          setBarcode(value);
          stopCamera();
        })
        .catch(() => undefined);
    }, 400);
    return () => {
      stopped = true;
      window.clearInterval(timer);
    };
  }, [cameraOpen, stopCamera]);

  async function startCamera() {
    const Detector = (
      window as Window & { BarcodeDetector?: BarcodeDetectorCtor }
    ).BarcodeDetector;
    if (!Detector || !navigator.mediaDevices?.getUserMedia) {
      toast({
        tone: "warning",
        title: "Kamera barkodu kullanılamıyor",
        description: "Barkod okuyucu bu alana yazar. Numarayı da elle girebilirsiniz.",
      });
      barcodeRef.current?.focus();
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: "environment" } },
        audio: false,
      });
      streamRef.current = stream;
      setCameraOpen(true);
    } catch {
      toast({
        tone: "error",
        title: "Kameraya erişilemedi",
        description: "Tarayıcı iznini kontrol edin veya barkod okuyucu kullanın.",
      });
    }
  }

  function onFiles(list: FileList | null) {
    const next = Array.from(list ?? [])
      .filter((file) => file.type !== "image/svg+xml")
      .slice(0, 8);
    setFilePreviews((current) => {
      current.forEach((url) => URL.revokeObjectURL(url));
      return next.map((file) => URL.createObjectURL(file));
    });
    setFiles(next);
  }

  async function save(status: "draft" | "active") {
    if (name.trim().length < 2) {
      toast({ tone: "error", title: "Ürün adı gerekli" });
      return;
    }
    if (!price.trim()) {
      toast({ tone: "error", title: "Satış fiyatını girin" });
      return;
    }
    if (!stock.trim()) {
      toast({ tone: "error", title: "Stok adedini girin" });
      return;
    }
    if (status === "active" && remoteImages.length + files.length === 0) {
      toast({
        tone: "error",
        title: "Görsel gerekli",
        description: "Yayınlamak için bir görsel bırakın veya dosya yükleyin. Taslak kaydedebilirsiniz.",
      });
      return;
    }

    const body = new FormData();
    body.set("name", name.trim());
    body.set("sku", (sku.trim() || barcode.replace(/\D/g, "")).trim());
    body.set("barcode", barcode.replace(/\D/g, ""));
    body.set("categoryId", categoryId);
    body.set("brandId", brandId);
    body.set("brandName", brandId ? "" : brandName.trim());
    body.set("shortDescription", shortDescription.trim());
    body.set("description", description.trim());
    body.set("price", price.trim());
    body.set("compareAtPrice", compareAtPrice.trim());
    body.set("stock", stock.trim());
    body.set("status", status);
    body.set("specs", JSON.stringify(specs));
    body.set("remoteImages", JSON.stringify(remoteImages));
    files.forEach((file) => body.append("files", file));

    setSaving(true);
    try {
      const result = await createProductFromBarcodeAction(body);
      if (!result.ok) {
        toast({
          tone: "error",
          title: "Kaydedilemedi",
          description: result.message,
        });
        if (result.existingId) {
          setExistingId(result.existingId);
        }
        return;
      }
      toast({
        tone: result.warning ? "warning" : "success",
        title: status === "active" ? "Ürün yayınlandı" : "Taslak kaydedildi",
        description: result.warning ?? `${result.imageCount} görsel eklendi.`,
      });
      router.push(`/admin/products/${result.id}`);
      router.refresh();
    } catch {
      toast({
        tone: "error",
        title: "Kaydedilemedi",
        description: "Kayıt tamamlanamadı. Tekrar deneyin.",
      });
    } finally {
      setSaving(false);
    }
  }

  const specEntries = Object.entries(specs);
  const imageMissing = Boolean(draft) && remoteImages.length + files.length === 0;

  return (
    <div className="mx-auto max-w-5xl space-y-5 pb-24 sm:pb-0">
      <div>
        <h1 className="font-display text-2xl font-semibold">Yeni ürün</h1>
        <p className="mt-1 text-sm text-[var(--bv-muted)]">
          Barkodu okutun. Ad, marka ve açıklama Icecat, açık kataloglar ve Gemini
          ile paralel çekilir. Siz fiyat, stok ve eksik alanları onaylarsınız.
        </p>
      </div>

      {looking ? <BarcodeLookupLoading barcode={barcode.replace(/\D/g, "") || barcode} /> : null}

      <section className="space-y-3 border border-[var(--bv-border)] bg-white p-4 sm:p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <div className="min-w-0 flex-1">
            <Input
              ref={barcodeRef}
              label="Barkod"
              name="barcode"
              inputMode="numeric"
              autoComplete="off"
              autoCorrect="off"
              spellCheck={false}
              placeholder="Okuyucu buraya yazar"
              value={barcode}
              onChange={(event) => setBarcode(event.target.value)}
              onKeyDown={(event) => {
                if (event.key !== "Enter") return;
                event.preventDefault();
                void applyLookup(barcode);
              }}
              className="h-12 text-base"
            />
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Button
              type="button"
              variant="accent"
              className="h-12 w-full sm:w-auto"
              disabled={looking}
              onClick={() => void applyLookup(barcode)}
            >
              <ScanBarcode className="h-4 w-4" />
              {looking ? "Aranıyor…" : "Bilgileri getir"}
            </Button>
            <Button
              type="button"
              variant="outline"
              className="h-12 w-full sm:w-auto"
              onClick={() => void startCamera()}
            >
              <Camera className="h-4 w-4" />
              Kameradan oku
            </Button>
          </div>
        </div>
        <p className="text-xs text-[var(--bv-muted)]">
          USB veya Bluetooth okuyucu rakamları yazıp Enter gönderir. Telefonda kamerayı
          kullanabilirsiniz.
        </p>
        {notice ? (
          <p className="text-sm text-[var(--bv-ink)]" role="status">
            {notice}
          </p>
        ) : null}
        {existingId ? (
          <Link
            href={`/admin/products/${existingId}`}
            className="inline-flex text-sm font-semibold text-[var(--bv-teal)] underline-offset-4 hover:underline"
          >
            Kayıtlı ürüne git{existingLabel ? `: ${existingLabel}` : ""}
          </Link>
        ) : null}
      </section>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
        <section className="space-y-3 border border-[var(--bv-border)] bg-white p-4 sm:p-5">
          <div className="flex items-center justify-between gap-3">
            <h2 className="font-semibold">Görseller</h2>
            {imageMissing ? (
              <span className="text-xs font-medium text-[var(--bv-warning)]">Görsel yok</span>
            ) : null}
          </div>
          {remoteImages.length || filePreviews.length ? (
            <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {remoteImages.map((url) => (
                <li key={url} className="relative aspect-square bg-[var(--bv-fog)]">
                  <img src={url} alt="" className="h-full w-full object-contain" />
                  <button
                    type="button"
                    className="absolute right-1 top-1 flex h-8 w-8 items-center justify-center bg-white/90"
                    aria-label="Görseli çıkar"
                    onClick={() =>
                      setRemoteImages((current) => current.filter((item) => item !== url))
                    }
                  >
                    <X className="h-4 w-4" />
                  </button>
                </li>
              ))}
              {filePreviews.map((url, index) => (
                <li key={url} className="relative aspect-square bg-[var(--bv-fog)]">
                  <img src={url} alt="" className="h-full w-full object-contain" />
                  <button
                    type="button"
                    className="absolute right-1 top-1 flex h-8 w-8 items-center justify-center bg-white/90"
                    aria-label="Yüklenen görseli çıkar"
                    onClick={() => {
                      URL.revokeObjectURL(url);
                      setFilePreviews((current) => current.filter((item) => item !== url));
                      setFiles((current) => current.filter((_, fileIndex) => fileIndex !== index));
                    }}
                  >
                    <X className="h-4 w-4" />
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-[var(--bv-muted)]">
              Katalogda görsel yoksa telefondan veya bilgisayardan yükleyin.
            </p>
          )}
          <label className="flex min-h-12 cursor-pointer items-center justify-center border border-dashed border-[var(--bv-border-strong)] px-3 py-3 text-sm font-medium">
            Görsel yükle
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              multiple
              className="sr-only"
              onChange={(event) => onFiles(event.target.files)}
            />
          </label>
        </section>

        <section className="space-y-4 border border-[var(--bv-border)] bg-white p-4 sm:p-5">
          <Input
            label="Ürün adı"
            name="name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            className="h-12 text-base"
            required
          />
          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              label="SKU"
              name="sku"
              value={sku}
              onChange={(event) => setSku(event.target.value)}
              className="h-12 text-base"
              required
            />
            <label className="flex flex-col gap-1.5 text-sm font-medium">
              Marka
              <select
                className={fieldClass}
                value={brandId}
                onChange={(event) => {
                  setBrandId(event.target.value);
                  if (event.target.value) setBrandName("");
                }}
              >
                <option value="">Seçin veya yeni yazın</option>
                {brands.map((brand) => (
                  <option key={brand.id} value={brand.id}>
                    {brand.name}
                  </option>
                ))}
              </select>
            </label>
          </div>
          {brandId ? null : (
            <Input
              label="Yeni marka"
              name="brandName"
              value={brandName}
              hint="Listede yoksa kayıt sırasında oluşturulur."
              onChange={(event) => setBrandName(event.target.value)}
              className="h-12 text-base"
            />
          )}
          <label className="flex flex-col gap-1.5 text-sm font-medium">
            Kategori
            <select
              className={fieldClass}
              value={categoryId}
              onChange={(event) => setCategoryId(event.target.value)}
            >
              <option value="">Kategori seçin</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.label}
                </option>
              ))}
            </select>
            {categoryHint && !categoryId ? (
              <span className="text-xs font-normal text-[var(--bv-warning)]">
                Katalog önerisi: {categoryHint}. Listeden karşılığını seçin.
              </span>
            ) : null}
          </label>
          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              label="Satış fiyatı"
              name="price"
              inputMode="decimal"
              value={price}
              hint="Katalogda yok, sizin girmeniz gerekir."
              onChange={(event) => setPrice(event.target.value)}
              className="h-12 text-base"
              required
            />
            <Input
              label="Karşılaştırma fiyatı"
              name="compareAtPrice"
              inputMode="decimal"
              value={compareAtPrice}
              onChange={(event) => setCompareAtPrice(event.target.value)}
              className="h-12 text-base"
            />
          </div>
          <Input
            label="Stok"
            name="stock"
            inputMode="numeric"
            value={stock}
            hint="Katalogda yok, sizin girmeniz gerekir."
            onChange={(event) => setStock(event.target.value)}
            className="h-12 text-base"
            required
          />
          <label className="flex flex-col gap-1.5 text-sm font-medium">
            Kısa açıklama
            <textarea
              value={shortDescription}
              onChange={(event) => setShortDescription(event.target.value)}
              rows={2}
              className="rounded-[var(--radius-md)] border border-[var(--bv-border-strong)] px-3 py-2 text-base font-normal"
            />
          </label>
          <label className="flex flex-col gap-1.5 text-sm font-medium">
            Açıklama
            <textarea
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              rows={6}
              className="rounded-[var(--radius-md)] border border-[var(--bv-border-strong)] px-3 py-2 text-base font-normal"
            />
          </label>
          {specEntries.length ? (
            <details className="border border-[var(--bv-border)] p-3">
              <summary className="cursor-pointer text-sm font-semibold">
                Teknik özellikler ({specEntries.length})
              </summary>
              <div className="mt-3 space-y-3">
                {specEntries.map(([key, value]) => (
                  <Input
                    key={key}
                    label={key}
                    value={value}
                    onChange={(event) =>
                      setSpecs((current) => ({ ...current, [key]: event.target.value }))
                    }
                    className="h-12 text-base"
                  />
                ))}
              </div>
            </details>
          ) : null}
        </section>
      </div>

      <div className="fixed inset-x-0 bottom-0 z-20 flex flex-col gap-2 border-t border-[var(--bv-border)] bg-white/95 p-3 backdrop-blur sm:static sm:flex-row sm:justify-end sm:border-0 sm:bg-transparent sm:p-0">
        <Link href="/admin/products" className="sm:mr-auto">
          <Button type="button" variant="outline" className="h-12 w-full sm:w-auto">
            İptal
          </Button>
        </Link>
        <Button
          type="button"
          variant="outline"
          className="h-12 w-full sm:w-auto"
          disabled={saving}
          onClick={() => void save("draft")}
        >
          Taslak kaydet
        </Button>
        <Button
          type="button"
          variant="accent"
          className="h-12 w-full sm:w-auto"
          disabled={saving}
          onClick={() => void save("active")}
        >
          {saving ? "Kaydediliyor…" : "Onayla ve yayınla"}
        </Button>
      </div>

      {cameraOpen ? (
        <div className="fixed inset-0 z-50 flex flex-col bg-black">
          <video
            ref={videoRef}
            className="min-h-0 flex-1 object-cover"
            playsInline
            muted
            autoPlay
          />
          <div className="space-y-2 p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
            <p className="text-center text-sm text-white">Barkodu çerçevenin içine getirin</p>
            <Button type="button" variant="secondary" className="h-12 w-full" onClick={stopCamera}>
              Kapat
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
