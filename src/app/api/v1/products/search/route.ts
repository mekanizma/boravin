import { requireWaaiAuth } from "@/lib/waai-api/auth";
import { jsonError, jsonOk, parsePagination } from "@/lib/waai-api/http";
import { searchProducts } from "@/lib/waai-api/products";

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
  const result = await searchProducts({ q, offset, limit });

  return jsonOk({
    query: result.query,
    items: result.items,
    pagination: {
      page,
      limit,
      total: result.total,
      totalPages: Math.max(1, Math.ceil(result.total / limit)),
    },
  });
}
