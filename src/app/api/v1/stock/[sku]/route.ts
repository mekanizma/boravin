import { requireWaaiAuth } from "@/lib/waai-api/auth";
import { jsonError, jsonOk } from "@/lib/waai-api/http";
import { getStockBySku } from "@/lib/waai-api/stock";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ sku: string }> };

export async function GET(request: Request, context: RouteContext) {
  const auth = requireWaaiAuth(request);
  if (!auth.ok) return auth.response;

  const { sku } = await context.params;
  const stock = await getStockBySku(decodeURIComponent(sku));
  if (!stock) {
    return jsonError("STOCK_NOT_FOUND", "SKU için stok kaydı bulunamadı.", 404);
  }

  return jsonOk(stock);
}
