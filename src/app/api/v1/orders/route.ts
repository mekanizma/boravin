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
        const suggestions =
          "suggestions" in err && Array.isArray(err.suggestions)
            ? err.suggestions
            : [];
        const hint =
          suggestions.length > 0
            ? ` Önerilen SKU’lar: ${suggestions
                .map((s) => `${s.name} (${s.sku})`)
                .join(", ")}.`
            : " Önce GET /api/v1/products/search?q=... ile ürünü bulun ve dönen sku alanını kullanın.";
        return jsonError(
          "PRODUCT_NOT_FOUND",
          `Ürün bulunamadı: ${err.sku}.${hint}`,
          422,
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
