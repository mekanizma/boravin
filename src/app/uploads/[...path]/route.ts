import { createReadStream, existsSync, statSync } from "fs";
import path from "path";
import { Readable } from "stream";
import { NextResponse } from "next/server";
import { resolveUploadKey } from "@/lib/storage/uploads-path";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MIME: Record<string, string> = {
  ".avif": "image/avif",
  ".gif": "image/gif",
  ".jpeg": "image/jpeg",
  ".jpg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
};

function contentTypeFor(filePath: string) {
  return MIME[path.extname(filePath).toLowerCase()] ?? "application/octet-stream";
}

type RouteContext = { params: Promise<{ path: string[] }> };

export async function GET(_request: Request, context: RouteContext) {
  const { path: parts } = await context.params;
  const fullPath = resolveUploadKey(parts ?? []);
  if (!fullPath || !existsSync(fullPath)) {
    return new NextResponse("Not found", { status: 404 });
  }

  let size = 0;
  try {
    const stat = statSync(fullPath);
    if (!stat.isFile()) {
      return new NextResponse("Not found", { status: 404 });
    }
    size = stat.size;
  } catch {
    return new NextResponse("Not found", { status: 404 });
  }

  const stream = createReadStream(fullPath);
  const body = Readable.toWeb(stream) as ReadableStream;

  return new NextResponse(body, {
    status: 200,
    headers: {
      "Content-Type": contentTypeFor(fullPath),
      "Content-Length": String(size),
      "Cache-Control": "public, max-age=31536000, immutable",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
