import { describe, expect, it } from "vitest";
import {
  barcodeCandidates,
  isAllowedProductImageUrl,
  isSafePublicImageUrl,
  mapIcecatProduct,
  mapOpenFactsProduct,
  mapUpcitemdbProduct,
  mapWebSearchProduct,
  matchCategoryId,
  normalizeBarcode,
  suggestSku,
} from "@/lib/barcode/parse";

describe("normalizeBarcode", () => {
  it("keeps retail barcode lengths", () => {
    expect(normalizeBarcode(" 4948 5701 14344 ")).toBe("4948570114344");
    expect(normalizeBarcode("12345678")).toBe("12345678");
    expect(normalizeBarcode("123")).toBeNull();
    expect(normalizeBarcode("ABC")).toBeNull();
  });

  it("adds EAN-13 and GTIN-14 forms of a UPC-A", () => {
    expect(barcodeCandidates("123456789012")).toEqual([
      "123456789012",
      "0123456789012",
      "00123456789012",
    ]);
  });
});

describe("mapIcecatProduct", () => {
  it("maps a Turkish Open Icecat payload", () => {
    const draft = mapIcecatProduct(
      {
        msg: "OK",
        data: {
          GeneralInfo: {
            Title: "iiyama ProLite monitör",
            Brand: "iiyama",
            BrandPartCode: "X4071UHSU-B1",
            Category: { Name: { Value: "PC Düz Ekran Monitörler" } },
            SummaryDescription: { ShortSummaryDescription: "4K monitör" },
            Description: { LongDesc: "<b>4K</b><br>USB hub" },
          },
          Image: {
            HighPic: "https://images.icecat.biz/img/gallery/front.jpg",
          },
          Gallery: [{ Pic: "https://images.icecat.biz/img/gallery/side.jpg" }],
          FeaturesGroups: [
            {
              Features: [
                {
                  PresentationValue: "100,3 cm (39.5\")",
                  Feature: { Name: { Value: "Ekran boyutu" } },
                },
              ],
            },
          ],
        },
      },
      "4948570114344",
    );

    expect(draft?.name).toBe("iiyama ProLite monitör");
    expect(draft?.brand).toBe("iiyama");
    expect(draft?.sku).toBe("X4071UHSU-B1");
    expect(draft?.description).toContain("USB hub");
    expect(draft?.imageUrls).toHaveLength(2);
    expect(draft?.specs["Ekran boyutu"]).toContain("39.5");
    expect(draft?.missing).toEqual([]);
    expect(draft?.sourceLabel).toBe("Open Icecat");
  });

  it("flags a record that has no photo", () => {
    const draft = mapIcecatProduct(
      {
        msg: "OK",
        data: {
          GeneralInfo: { Title: "Kablosuz mouse", Brand: "Logitech" },
        },
      },
      "5099206087486",
    );
    expect(draft?.missing).toContain("Ürün görseli");
    expect(suggestSku(null, "5099206087486")).toBe("5099206087486");
  });

  it("ignores unknown payloads", () => {
    expect(mapIcecatProduct({ Message: "The GTIN can not be found" }, "12345678")).toBeNull();
  });

  it("uses long summary when LongDesc is empty", () => {
    const draft = mapIcecatProduct(
      {
        msg: "OK",
        data: {
          GeneralInfo: {
            Title: "Samsung monitör",
            Brand: "Samsung",
            SummaryDescription: {
              ShortSummaryDescription: "Kısa",
              LongSummaryDescription: "Uzun özet açıklama",
            },
            Description: {},
          },
        },
      },
      "8806094972252",
    );
    expect(draft?.description).toBe("Uzun özet açıklama");
  });
});

describe("mapUpcitemdbProduct", () => {
  it("maps electronics retail payloads and allows CDN images", () => {
    const draft = mapUpcitemdbProduct(
      {
        code: "OK",
        items: [
          {
            title: "Iiyama ProLite LED Monitor 40\"",
            brand: "iiyama",
            model: "X4071UHSU-B1",
            category: "Electronics > Video > Computer Monitors",
            description: "4K Ultra HD monitor",
            images: ["https://images10.newegg.com/ProductImage/front.jpg"],
          },
        ],
      },
      "4948570114344",
    );
    expect(draft?.source).toBe("upcitemdb");
    expect(draft?.name).toContain("Iiyama");
    expect(draft?.categoryHint).toBe("Computer Monitors");
    expect(draft?.specs["Model"]).toBe("X4071UHSU-B1");
    expect(draft?.imageUrls).toEqual(["https://images10.newegg.com/ProductImage/front.jpg"]);
    expect(isAllowedProductImageUrl("https://images10.newegg.com/ProductImage/front.jpg")).toBe(
      true,
    );
  });
});

describe("mapOpenFactsProduct", () => {
  it("prefers the Turkish name and keeps allowed images", () => {
    const draft = mapOpenFactsProduct(
      {
        status: 1,
        product: {
          product_name_tr: "Örnek ürün",
          brands: "Örnek",
          quantity: "1 adet",
          image_front_url: "https://images.openproductsfacts.org/front.jpg",
          image_url: "https://evil.example/hack.jpg",
        },
      },
      "8690000000001",
      "openproductsfacts",
    );
    expect(draft?.name).toBe("Örnek ürün");
    expect(draft?.imageUrls).toEqual(["https://images.openproductsfacts.org/front.jpg"]);
    expect(isAllowedProductImageUrl("http://images.icecat.biz/a.jpg")).toBe(false);
    expect(isAllowedProductImageUrl("https://127.0.0.1/a.jpg")).toBe(false);
  });
});

describe("matchCategoryId", () => {
  const categories = [
    { id: "1", name: "Notebook", slug: "bilgisayar-notebook" },
    { id: "2", name: "Gaming Laptoplar", slug: "bilgisayar-notebook-gaming-laptoplar" },
    { id: "3", name: "Monitörler", slug: "bilesenler-monitorler" },
    { id: "4", name: "Gaming Monitörler", slug: "bilesenler-monitorler-gaming-monitorler" },
  ];

  it("picks the closest catalog category", () => {
    expect(matchCategoryId(categories, "PC Düz Ekran Monitörler", "iiyama")).toBe("3");
    expect(matchCategoryId(categories, "Gaming monitors", "Asus laptop")).toBe("4");
    expect(matchCategoryId(categories, "Notebooks", "Lenovo")).toBe("1");
  });
});

describe("mapWebSearchProduct", () => {
  it("keeps google CDN images with loose policy", () => {
    const draft = mapWebSearchProduct(
      {
        name: "Samsung Galaxy",
        brand: "Samsung",
        description: "Akıllı telefon",
        imageUrls: [
          "https://lh3.googleusercontent.com/product.jpg",
          "https://evil.internal/private.jpg",
        ],
      },
      "8806094972252",
      "google",
    );
    expect(draft?.sourceLabel).toBe("Google (AI arama)");
    expect(draft?.imageUrls).toEqual(["https://lh3.googleusercontent.com/product.jpg"]);
    expect(isSafePublicImageUrl("https://cdn.shopify.com/s/files/1/x.jpg")).toBe(true);
    expect(isAllowedProductImageUrl("https://cdn.shopify.com/s/files/1/x.jpg")).toBe(true);
    expect(isSafePublicImageUrl("https://192.168.1.1/a.jpg")).toBe(false);
  });
});
