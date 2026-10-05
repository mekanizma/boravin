import { ZodError } from "zod";
import { requireWaaiAuth } from "@/lib/waai-api/auth";
import { jsonError, jsonWaaiOrder } from "@/lib/waai-api/http";
import { createWaaiOrder, getOrderByNumber } from "@/lib/waai-api/orders";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function zodMessage(error: ZodError) {
  const first = error.issues[0];
  if (!first) return "Sipariş verisi geçersiz.";
  const path = first.path.length ? first.path.join(".") : "body";
  return `${path}: ${first.message}`;
}

/** WhatsApp status query via ?q= / ?phone= / ?orderNumber= */
export async function GET(request: Request) {
  const auth = requireWaaiAuth(request);
  if (!auth.ok) return auth.response;

  const url = new URL(request.url);
  const q =
    url.searchParams.get("orderNumber")?.trim() ||
    url.searchParams.get("phone")?.trim() ||
    url.searchParams.get("q")?.trim() ||
    url.searchParams.get("query")?.trim() ||
    url.searchParams.get("search")?.trim() ||
    "";

  if (!q) {
    return jsonError(
      "MISSING_QUERY",
      "Sipariş no veya telefon gerekli (?orderNumber= / ?phone= / ?q=).",
      400,
    );
  }

  const order = await getOrderByNumber(q);
  if (!order) {
    return jsonError(
      "ORDER_NOT_FOUND",
      "Sipariş bulunamadı. Sipariş numarasını (WA… / BV…) veya siparişteki telefon numarasını deneyin.",
      404,
    );
  }

  return jsonWaaiOrder(order as Record<string, unknown>);
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

    return jsonWaaiOrder(result.order as Record<string, unknown>, {
      status: 201,
    });
  } catch (error) {
    if (error instanceof ZodError) {
      return jsonError("VALIDATION_ERROR", zodMessage(error), 400, {
        issues: error.issues,
      });
    }
    throw error;
  }
}
