import { requireWaaiAuth } from "@/lib/waai-api/auth";
import { jsonError, jsonWaaiProductList, parsePagination } from "@/lib/waai-api/http";
import { listProducts, searchProducts } from "@/lib/waai-api/products";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const auth = requireWaaiAuth(request);
  if (!auth.ok) return auth.response;

  const url = new URL(request.url);
  const q = url.searchParams.get("q")?.trim() ?? "";
  if (!q) {
    return jsonError("MISSING_QUERY", "q parametresi zorunludur.", 400);
  }

  const { page, limit, offset } = parsePagination(url);

  // Waai bağlantı testi `?q=test` gönderir; mağazada eşleşme olmayabilir.
  const isProbe = q.toLowerCase() === "test";
  const result = isProbe
    ? await listProducts({ offset: 0, limit: Math.min(limit, 5) })
    : await searchProducts({ q, offset, limit });

  const items = result.items;
  const total = result.total;
  const queryLabel =
    isProbe || !("query" in result) ? q : (result.query as string);

  return jsonWaaiProductList(items, {
    query: queryLabel,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.max(1, Math.ceil(total / limit)),
    },
  });
}
