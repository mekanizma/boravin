import { NextResponse } from "next/server";

export function jsonOk<T>(data: T, init?: { status?: number }) {
  return NextResponse.json(
    { ok: true as const, data },
    { status: init?.status ?? 200 },
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
