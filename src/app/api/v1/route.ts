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
  });
}
