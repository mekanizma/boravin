import { requireWaaiAuth } from "@/lib/waai-api/auth";
import { jsonError, jsonOk } from "@/lib/waai-api/http";
import { getProductBySku } from "@/lib/waai-api/products";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ sku: string }> };

export async function GET(_request: Request, context: RouteContext) {
  const auth = requireWaaiAuth(_request);
  if (!auth.ok) return auth.response;

  const { sku } = await context.params;
  const product = await getProductBySku(decodeURIComponent(sku));
  if (!product) {
    return jsonError("PRODUCT_NOT_FOUND", "Ürün bulunamadı.", 404);
  }

  return jsonOk(product);
}
