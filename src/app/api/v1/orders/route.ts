import { ZodError } from "zod";
import { requireWaaiAuth } from "@/lib/waai-api/auth";
import { jsonError, jsonOk } from "@/lib/waai-api/http";
import { createWaaiOrder } from "@/lib/waai-api/orders";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const auth = requireWaaiAuth(request);
  if (!auth.ok) return auth.response;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError("INVALID_JSON", "Geçersiz JSON gövdesi.", 400);
  }

  try {
    const result = await createWaaiOrder(body);
    if (!result.ok) {
      const err = result.error;
      if (err.error === "PRODUCT_NOT_FOUND") {
        return jsonError(
          "PRODUCT_NOT_FOUND",
          `SKU bulunamadı: ${err.sku}`,
          404,
          err,
        );
      }
      if (err.error === "INSUFFICIENT_STOCK") {
        return jsonError(
          "INSUFFICIENT_STOCK",
          `Yetersiz stok: ${err.sku}`,
          409,
          err,
        );
      }
      return jsonError(
        String(err.error ?? "ORDER_FAILED"),
        "Sipariş oluşturulamadı.",
        400,
        err,
      );
    }

    return jsonOk(result.order, { status: 201 });
  } catch (error) {
    if (error instanceof ZodError) {
      return jsonError("VALIDATION_ERROR", "Sipariş verisi geçersiz.", 400, {
        issues: error.issues,
      });
    }
    throw error;
  }
}
