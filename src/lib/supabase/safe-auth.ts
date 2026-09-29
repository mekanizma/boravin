import type { User, SupabaseClient } from "@supabase/supabase-js";

/**
 * Auth network calls (getUser) can ETIMEDOUT from Render → Supabase.
 * Never let that crash the request; treat as signed-out.
 */
export async function safeGetUser(
  supabase: SupabaseClient,
): Promise<User | null> {
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    return user ?? null;
  } catch (error) {
    const cause =
      error instanceof Error && "cause" in error
        ? (error as Error & { cause?: { code?: string } }).cause
        : undefined;
    const code =
      cause && typeof cause === "object" && "code" in cause
        ? String(cause.code)
        : "";
    console.warn(
      "[supabase] getUser failed:",
      error instanceof Error ? error.message : error,
      code ? `(${code})` : "",
    );
    return null;
  }
}

/** True when a Supabase auth cookie is present (avoids useless Auth API round-trips). */
export function hasSupabaseAuthCookie(
  cookies: { name: string }[],
): boolean {
  return cookies.some(
    (c) =>
      c.name.startsWith("sb-") &&
      (c.name.endsWith("-auth-token") ||
        c.name.includes("auth-token")),
  );
}

export async function safeSignOut(supabase: SupabaseClient): Promise<void> {
  try {
    await supabase.auth.signOut();
  } catch (error) {
    console.warn(
      "[supabase] signOut failed:",
      error instanceof Error ? error.message : error,
    );
  }
}
