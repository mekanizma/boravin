import { ZodError } from "zod";
import { requireWaaiAuth } from "@/lib/waai-api/auth";
import { jsonError, jsonOk } from "@/lib/waai-api/http";
import { createWaaiOrder } from "@/lib/waai-api/orders";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function zodMessage(error: ZodError) {
  const first = error.issues[0];
  if (!first) return "Sipariş verisi geçersiz.";
  const path = first.path.length ? first.path.join(".") : "body";
  return `${path}: ${first.message}`;
}

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
          `Ürün bulunamadı: ${err.sku}. Arama sonucundaki sku alanını kullanın.`,
          404,
          err,
        );
      }
      if (err.error === "INSUFFICIENT_STOCK") {
        const available =
          "available" in err && typeof err.available === "number"
            ? err.available
            : undefined;
        return jsonError(
          "INSUFFICIENT_STOCK",
          `Yetersiz stok: ${err.sku}${
            available != null ? ` (mevcut: ${available})` : ""
          }`,
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
      return jsonError("VALIDATION_ERROR", zodMessage(error), 400, {
        issues: error.issues,
      });
    }
    throw error;
  }
}
