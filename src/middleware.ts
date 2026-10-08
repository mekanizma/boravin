import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const { response, user } = await updateSession(request);

  const isAdmin = pathname.startsWith("/admin");
  const isLogin = pathname.startsWith("/admin/login");

  if (!isAdmin) {
    return response;
  }

  const kind = user?.app_metadata?.kind;

  if (isLogin) {
    if (kind === "admin") {
      return NextResponse.redirect(new URL("/admin", request.nextUrl.origin));
    }
    return response;
  }

  if (!user || kind !== "admin") {
    const url = new URL("/admin/login", request.nextUrl.origin);
    url.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(url);
  }

  return response;
}

export const config = {
  // Storefront navigations skip middleware entirely — huge win on Render latency.
  matcher: [
    "/admin/:path*",
    "/hesabim/:path*",
    "/uye-ol",
  ],
};
