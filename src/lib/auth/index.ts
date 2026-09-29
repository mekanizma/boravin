import { eq, or } from "drizzle-orm";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { getUserPermissions } from "@/lib/auth/permissions-query";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export type AppSession = {
  user: {
    id: string;
    email?: string | null;
    name?: string | null;
    role?: string;
    permissions: string[];
  };
};

/** Current admin (staff) session from Supabase Auth + `users` table. */
export async function auth(): Promise<AppSession | null> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();
  if (!authUser?.email) return null;

  const email = authUser.email.toLowerCase();
  const staff = await db.query.users.findFirst({
    where: or(eq(users.id, authUser.id), eq(users.email, email)),
  });
  if (!staff || !staff.isActive) return null;

  const { role, permissions } = await getUserPermissions(staff.id);
  return {
    user: {
      id: staff.id,
      email: staff.email,
      name: staff.name,
      role: role ?? undefined,
      permissions,
    },
  };
}

export async function signOutAdmin() {
  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut();
}
