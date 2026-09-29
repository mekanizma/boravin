export interface SearchHit {
  id: string;
  type: "product" | "category" | "brand" | "page" | "blog";
  title: string;
  slug: string;
  excerpt?: string;
  score: number;
  meta?: Record<string, unknown>;
}

export interface SearchQuery {
  q: string;
  types?: SearchHit["type"][];
  categoryId?: string;
  brandId?: string;
  limit?: number;
  offset?: number;
  filters?: Record<string, string | string[] | number | boolean>;
}

export interface SearchResult {
  hits: SearchHit[];
  total: number;
  tookMs: number;
  provider: string;
}

export interface SearchProvider {
  readonly name: string;
  search(query: SearchQuery): Promise<SearchResult>;
  indexProduct?(productId: string): Promise<void>;
  removeProduct?(productId: string): Promise<void>;
}
