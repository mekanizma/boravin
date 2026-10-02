import { requireWaaiAuth } from "@/lib/waai-api/auth";
import { jsonError, jsonWaaiProduct } from "@/lib/waai-api/http";
import { getProductBySku } from "@/lib/waai-api/products";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ sku: string }> };

export async function GET(request: Request, context: RouteContext) {
  const auth = requireWaaiAuth(request);
  if (!auth.ok) return auth.response;

  const { sku: paramSku } = await context.params;
  const url = new URL(request.url);
  const sku =
    decodeURIComponent(paramSku).trim() ||
    url.searchParams.get("sku")?.trim() ||
    url.searchParams.get("q")?.trim() ||
    url.searchParams.get("name")?.trim() ||
    "";

  const product = await getProductBySku(sku);
  if (!product) {
    return jsonError(
      "PRODUCT_NOT_FOUND",
      `Ürün bulunamadı: ${sku}. Arama endpoint’ini kullanın: /api/v1/products/search?q=...`,
      404,
    );
  }

  return jsonWaaiProduct(product as Record<string, unknown>);
}
