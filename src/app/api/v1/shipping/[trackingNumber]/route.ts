import { requireWaaiAuth } from "@/lib/waai-api/auth";
import { jsonError, jsonWaaiShipping } from "@/lib/waai-api/http";
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
      "Kargo veya sipariş bulunamadı. Takip no, sipariş no (WA… / BV…) veya telefon numarasını deneyin.",
      404,
    );
  }

  return jsonWaaiShipping(shipping as Record<string, unknown>);
}
