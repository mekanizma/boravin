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

  if (isLogin) {
    if (user?.app_metadata?.kind === "admin") {
      return NextResponse.redirect(new URL("/admin", request.nextUrl.origin));
    }
    return response;
  }

  if (!user || user.app_metadata?.kind !== "admin") {
    const url = new URL("/admin/login", request.nextUrl.origin);
    url.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(url);
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * Refresh auth cookies on app routes; skip static assets.
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
