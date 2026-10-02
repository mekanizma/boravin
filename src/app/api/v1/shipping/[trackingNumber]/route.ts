import { requireWaaiAuth } from "@/lib/waai-api/auth";
import { jsonError, jsonOk } from "@/lib/waai-api/http";
import { getShippingByTracking } from "@/lib/waai-api/shipping";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ trackingNumber: string }> };

export async function GET(request: Request, context: RouteContext) {
  const auth = requireWaaiAuth(request);
  if (!auth.ok) return auth.response;

  const { trackingNumber } = await context.params;
  const shipping = await getShippingByTracking(
    decodeURIComponent(trackingNumber),
  );
  if (!shipping) {
    return jsonError(
      "SHIPPING_NOT_FOUND",
      "Kargo veya sipariş bulunamadı. Takip numarasını veya sipariş numarasını (WA…) doğru girin; admin panelde takip no kayıtlı olmalı.",
      404,
    );
  }

  return jsonOk(shipping);
}
