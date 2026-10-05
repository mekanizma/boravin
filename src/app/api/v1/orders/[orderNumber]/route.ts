import { requireWaaiAuth } from "@/lib/waai-api/auth";
import { jsonError, jsonWaaiOrder } from "@/lib/waai-api/http";
import { getOrderByNumber } from "@/lib/waai-api/orders";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ orderNumber: string }> };

export async function GET(request: Request, context: RouteContext) {
  const auth = requireWaaiAuth(request);
  if (!auth.ok) return auth.response;

  const { orderNumber } = await context.params;
  const order = await getOrderByNumber(decodeURIComponent(orderNumber));
  if (!order) {
    return jsonError(
      "ORDER_NOT_FOUND",
      "Sipariş bulunamadı. Sipariş numarasını (WA… / BV…) veya siparişteki telefon numarasını deneyin.",
      404,
    );
  }

  return jsonWaaiOrder(order as Record<string, unknown>);
}
