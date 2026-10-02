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
      productDetail: "GET /api/v1/products/{sku}",
      productSearch: "GET /api/v1/products/search?q={query}",
      recommendations: "GET /api/v1/products/{sku}/recommendations",
      stock: "GET /api/v1/stock/{sku}",
      createOrder: "POST /api/v1/orders",
      orderDetail: "GET /api/v1/orders/{orderNumber}",
      shipping: "GET /api/v1/shipping/{trackingNumber}",
    },
    createOrderHints: {
      rule: "WhatsApp siparişinde mutlaka ad soyad, telefon, açık adres ve şehir isteyin. E-posta varsa alın, zorunlu değil. Eksik zorunlu bilgiyle sipariş oluşturulmaz.",
      fulfillment: "delivery | pickup",
      customerRequired: ["fullName", "phone", "line1", "city"],
      customerOptional: ["email"],
      askCustomer:
        "Adınız soyadınız, telefon numaranız, açık adresiniz ve şehriniz nedir? Varsa e-posta adresinizi de yazabilirsiniz (zorunlu değil).",
      items: [{ sku: "katalog sku veya ürün adı", quantity: 1 }],
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
        items: [{ sku: "iPhone 16 Pro", quantity: 1 }],
        paymentMethod: "whatsapp",
      },
    },
  });
}
