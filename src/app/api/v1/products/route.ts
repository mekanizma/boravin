import { requireWaaiAuth } from "@/lib/waai-api/auth";
import {
  jsonWaaiProductList,
  parsePagination,
  parseSearchQuery,
} from "@/lib/waai-api/http";
import { listProducts, searchProducts } from "@/lib/waai-api/products";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const auth = requireWaaiAuth(request);
  if (!auth.ok) return auth.response;

  const url = new URL(request.url);
  const { page, limit, offset } = parsePagination(url);
  const q = parseSearchQuery(url);

  const inStockOnly = url.searchParams.get("inStock") === "1";

  // Waai sometimes hits /products?q=... instead of /products/search?q=...
  // Both list?q= and /search share searchProducts (same ranking).
  const result = q
    ? q.toLowerCase() === "test"
      ? await listProducts({ offset: 0, limit: Math.min(limit, 5), inStockOnly })
      : await searchProducts({ q, offset, limit, inStockOnly })
    : await listProducts({
        offset,
        limit,
        category: url.searchParams.get("category"),
        brand: url.searchParams.get("brand"),
        inStockOnly,
      });

  const bestMatch =
    q && "bestMatch" in result
      ? (result.bestMatch as Record<string, unknown> | null)
      : null;
  const bestMatchConfidence =
    q && "bestMatchConfidence" in result
      ? (result.bestMatchConfidence as number | null)
      : null;

  return jsonWaaiProductList(result.items as Array<Record<string, unknown>>, {
    ...(q ? { query: q } : {}),
    bestMatch,
    bestMatchConfidence,
    pagination: {
      page,
      limit,
      total: result.total,
      totalPages: Math.max(1, Math.ceil(result.total / limit)),
    },
  });
}
