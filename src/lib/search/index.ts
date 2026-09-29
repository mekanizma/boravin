import { and, eq, ilike, or, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { products } from "@/lib/db/schema";
import type {
  SearchHit,
  SearchProvider,
  SearchQuery,
  SearchResult,
} from "@/lib/search/types";

export type * from "@/lib/search/types";

/**
 * Postgres-backed search stub.
 * Currently does a simple ILIKE over product name/sku/shortDescription.
 * Can be extended with full-text search / search_vector later.
 */
export class PostgresSearchProvider implements SearchProvider {
  readonly name = "postgres";

  async search(query: SearchQuery): Promise<SearchResult> {
    const started = Date.now();
    const q = query.q.trim();
    const limit = Math.min(query.limit ?? 20, 100);
    const offset = query.offset ?? 0;
    const types = query.types ?? ["product"];

    if (!q || !types.includes("product")) {
      return {
        hits: [],
        total: 0,
        tookMs: Date.now() - started,
        provider: this.name,
      };
    }

    const pattern = `%${q}%`;
    const conditions = [
      or(
        ilike(products.name, pattern),
        ilike(products.sku, pattern),
        ilike(products.shortDescription, pattern),
        ilike(products.seoTitle, pattern),
      ),
      eq(products.status, "active"),
    ];

    if (query.categoryId) {
      conditions.push(eq(products.categoryId, query.categoryId));
    }
    if (query.brandId) {
      conditions.push(eq(products.brandId, query.brandId));
    }

    const where = and(...conditions);

    const [rows, countRows] = await Promise.all([
      db
        .select({
          id: products.id,
          name: products.name,
          slug: products.slug,
          shortDescription: products.shortDescription,
          price: products.price,
        })
        .from(products)
        .where(where)
        .limit(limit)
        .offset(offset),
      db
        .select({ count: sql<number>`count(*)::int` })
        .from(products)
        .where(where),
    ]);

    const hits: SearchHit[] = rows.map((row, index) => ({
      id: row.id,
      type: "product" as const,
      title: row.name,
      slug: row.slug,
      excerpt: row.shortDescription ?? undefined,
      score: Math.max(0.1, 1 - index * 0.02),
      meta: { price: row.price },
    }));

    return {
      hits,
      total: countRows[0]?.count ?? hits.length,
      tookMs: Date.now() - started,
      provider: this.name,
    };
  }

  async indexProduct(productId: string): Promise<void> {
    void productId;
    // Stub: future full-text / search_vector update.
  }

  async removeProduct(productId: string): Promise<void> {
    void productId;
    // Stub: future index cleanup.
  }
}

export const postgresSearchProvider = new PostgresSearchProvider();

export function getSearchProvider(name?: string): SearchProvider {
  const provider = (name ?? process.env.SEARCH_PROVIDER ?? "postgres").toLowerCase();

  switch (provider) {
    case "postgres":
      return postgresSearchProvider;
    default:
      throw new Error(
        `Unknown SEARCH_PROVIDER "${provider}". Supported: postgres`,
      );
  }
}

export async function search(query: SearchQuery): Promise<SearchResult> {
  return getSearchProvider().search(query);
}
