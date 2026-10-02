import { requireWaaiAuth } from "@/lib/waai-api/auth";
import { jsonOk, parsePagination } from "@/lib/waai-api/http";
import { listProducts } from "@/lib/waai-api/products";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const auth = requireWaaiAuth(request);
  if (!auth.ok) return auth.response;

  const url = new URL(request.url);
  const { page, limit, offset } = parsePagination(url);
  const result = await listProducts({
    offset,
    limit,
    category: url.searchParams.get("category"),
    brand: url.searchParams.get("brand"),
    inStockOnly: url.searchParams.get("inStock") === "1",
  });

  return jsonOk({
    items: result.items,
    pagination: {
      page,
      limit,
      total: result.total,
      totalPages: Math.max(1, Math.ceil(result.total / limit)),
    },
  });
}
