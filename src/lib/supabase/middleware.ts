import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import {
  getSupabasePublishableKey,
  getSupabaseUrl,
} from "@/lib/supabase/env";
import { hasSupabaseAuthCookie, safeGetUser } from "@/lib/supabase/safe-auth";

type AuthUser = {
  id: string;
  email?: string;
  app_metadata: Record<string, unknown>;
  user_metadata: Record<string, unknown>;
};

/**
 * Prefer local JWT claims (no Auth round-trip) for middleware gates.
 * Falls back to getUser when claims are unavailable.
 */
async function resolveMiddlewareUser(
  supabase: ReturnType<typeof createServerClient>,
): Promise<AuthUser | null> {
  try {
    const { data, error } = await supabase.auth.getClaims();
    if (!error && data?.claims) {
      const claims = data.claims as {
        sub?: string;
        email?: string;
        app_metadata?: Record<string, unknown>;
        user_metadata?: Record<string, unknown>;
      };
      if (claims.sub) {
        return {
          id: claims.sub,
          email: claims.email ?? undefined,
          app_metadata: claims.app_metadata ?? {},
          user_metadata: claims.user_metadata ?? {},
        };
      }
    }
  } catch {
    // Symmetric JWT / missing WebCrypto — fall through to getUser.
  }

  return safeGetUser(supabase);
}

/** Refresh Supabase auth cookies on every matched request. */
export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({
    request: { headers: request.headers },
  });

  if (!hasSupabaseAuthCookie(request.cookies.getAll())) {
    return { response, user: null, supabase: null };
  }

  const supabase = createServerClient(
    getSupabaseUrl(),
    getSupabasePublishableKey(),
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          for (const { name, value } of cookiesToSet) {
            request.cookies.set(name, value);
          }
          response = NextResponse.next({
            request: { headers: request.headers },
          });
          for (const { name, value, options } of cookiesToSet) {
            response.cookies.set(name, value, options);
          }
        },
      },
    },
  );

  const user = await resolveMiddlewareUser(supabase);

  return { response, user, supabase };
}
