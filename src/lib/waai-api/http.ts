import { NextResponse } from "next/server";

export function jsonOk<T>(data: T, init?: { status?: number }) {
  return NextResponse.json(
    { ok: true as const, data },
    { status: init?.status ?? 200 },
  );
}

/** Waai / website-api.client expects `products`, `items`, or an array `data`. */
export function jsonWaaiProductList<T extends Record<string, unknown>>(
  items: T[],
  meta?: {
    status?: number;
    query?: string;
    pagination?: Record<string, unknown>;
  },
) {
  return NextResponse.json(
    {
      ok: true as const,
      products: items,
      items,
      data: items,
      ...(meta?.query ? { query: meta.query } : {}),
      ...(meta?.pagination ? { pagination: meta.pagination } : {}),
    },
    { status: meta?.status ?? 200 },
  );
}

export function jsonError(
  code: string,
  message: string,
  status = 400,
  details?: unknown,
) {
  return NextResponse.json(
    {
      ok: false as const,
      error: { code, message, ...(details !== undefined ? { details } : {}) },
    },
    { status },
  );
}

export function parsePagination(url: URL) {
  const page = Math.max(1, Number(url.searchParams.get("page") ?? 1) || 1);
  const limit = Math.min(
    100,
    Math.max(1, Number(url.searchParams.get("limit") ?? 20) || 20),
  );
  return { page, limit, offset: (page - 1) * limit };
}
