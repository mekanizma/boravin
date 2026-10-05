import { getAppUrl } from "@/lib/env/app-url";
import { isWaaiApiConfigured, requireWaaiAuth } from "@/lib/waai-api/auth";
import { jsonOk } from "@/lib/waai-api/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Connection test for Waai / AI live API. */
export async function GET(request: Request) {
  const auth = requireWaaiAuth(request);
  if (!auth.ok) return auth.response;

  return jsonOk({
    name: "Boravin Waai API",
    version: "v1",
    baseUrl: `${getAppUrl()}/api/v1`,
    configured: isWaaiApiConfigured(),
    endpoints: {
      products: "GET /api/v1/products",
      productDetail:
        "GET /api/v1/products/{sku|name|slug|barcode|variantSku}",
      productSearch:
        "GET /api/v1/products/search?q={query} (veya GET /api/v1/products?q=...)",
      productSearchHint:
        "Ad, SKU, slug, barkod, marka, kategori ve varyant SKU arar; sonuçlar alakalılık sırasıyla döner.",
      recommendations: "GET /api/v1/products/{sku}/recommendations",
      stock: "GET /api/v1/stock/{sku|name|variantSku}",
      createOrder: "POST /api/v1/orders",
      orderDetail: "GET /api/v1/orders/{orderNumber}",
      orderLookup:
        "GET /api/v1/orders?q={orderNumber|phone} veya ?phone=… — durum sorgusu",
      shipping: "GET /api/v1/shipping/{trackingNumber}",
      shippingHint:
        "Takip no, sipariş no (WA…/BV…) veya telefon kabul eder. Admin panelde kargo takip no girilmezse trackingNumber boş olabilir; orderStatus yine döner.",
      orderStatusNotify:
        "Admin durum değişince WhatsApp bildirimi: WHATSAPP_NOTIFY_WEBHOOK_URL veya Meta WHATSAPP_ACCESS_TOKEN + WHATSAPP_PHONE_NUMBER_ID",
    },
    createOrderHints: {
      rule: "WhatsApp siparişinde mutlaka ad soyad, telefon, açık adres ve şehir isteyin. E-posta varsa alın, zorunlu değil. Varyantlı üründe renk/depolama seçtirip variants[].sku kullanın. Eksik zorunlu bilgiyle sipariş oluşturulmaz.",
      fulfillment: "delivery | pickup",
      customerRequired: ["fullName", "phone", "line1", "city"],
      customerOptional: ["email"],
      askCustomer:
        "Adınız soyadınız, telefon numaranız, açık adresiniz ve şehriniz nedir? Varsa e-posta adresinizi de yazabilirsiniz (zorunlu değil).",
      productFields:
        "Liste/arama/detay: specs, technicalSpecs, attributes, variants (sku + options). Siparişte variant sku veya options:{renk,depolama} gönderin.",
      items: [
        {
          sku: "katalog sku veya ürün adı veya varyant sku",
          quantity: 1,
          options: { renk: "Siyah", depolama: "256GB" },
        },
      ],
      paymentMethod: "whatsapp",
      examplePickup: {
        fulfillment: "pickup",
        customer: {
          fullName: "Gurcem Semercioglu",
          phone: "05338507761",
          email: "ornek@email.com",
          line1: "Mustafa Çağatay Cd. No: 3 civarı / Mağazadan teslim",
          city: "Girne",
        },
        items: [{ sku: "iPhone 16 Pro", quantity: 1, options: { renk: "Siyah" } }],
        paymentMethod: "whatsapp",
      },
    },
  });
}
