export type BarcodeSource =
  | "icecat"
  | "upcitemdb"
  | "openproductsfacts"
  | "openfoodfacts"
  | "openbeautyfacts"
  | "wikidata"
  | "google"
  | "duckduckgo";

export type ProductDraft = {
  source: BarcodeSource;
  sourceLabel: string;
  name: string;
  brand: string;
  categoryHint: string;
  shortDescription: string;
  description: string;
  sku: string;
  imageUrls: string[];
  specs: Record<string, string>;
  missing: string[];
};

export type CatalogOption = {
  id: string;
  name: string;
  slug: string;
};

export type ExistingProductHit = {
  id: string;
  name: string;
  sku: string;
};

export type BarcodeLookupResult =
  | {
      ok: true;
      barcode: string;
      existing: ExistingProductHit | null;
      draft: ProductDraft | null;
      offline: boolean;
      matchedCategoryId: string | null;
      matchedBrandId: string | null;
    }
  | { ok: false; message: string };

export type CreateFromBarcodeResult =
  | {
      ok: true;
      id: string;
      imageCount: number;
      warning?: string;
    }
  | { ok: false; message: string; existingId?: string };
