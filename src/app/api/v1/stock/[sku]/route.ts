import { requireWaaiAuth } from "@/lib/waai-api/auth";
import { jsonError, jsonWaaiStock } from "@/lib/waai-api/http";
import { getStockBySku } from "@/lib/waai-api/stock";

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

  const stock = await getStockBySku(sku);
  if (!stock) {
    return jsonError(
      "STOCK_NOT_FOUND",
      `Stok bulunamadı: ${sku}. Ürün adı veya katalog SKU deneyin.`,
      404,
    );
  }

  return jsonWaaiStock(stock as Record<string, unknown>);
}
