import { requireWaaiAuth } from "@/lib/waai-api/auth";
import { jsonWaaiProductList } from "@/lib/waai-api/http";
import { getRecommendations } from "@/lib/waai-api/products";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ sku: string }> };

export async function GET(request: Request, context: RouteContext) {
  const auth = requireWaaiAuth(request);
  if (!auth.ok) return auth.response;

  const { sku } = await context.params;
  const url = new URL(request.url);
  const limit = Number(url.searchParams.get("limit") ?? 8) || 8;

  const result = await getRecommendations({
    sku: decodeURIComponent(sku),
    limit,
  });

  return jsonWaaiProductList(result.items as Array<Record<string, unknown>>, {
    query: result.seedSku ?? decodeURIComponent(sku),
    pagination: {
      page: 1,
      limit,
      total: result.items.length,
      totalPages: 1,
    },
  });
}
