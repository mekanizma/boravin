import { eq } from "drizzle-orm";
import { cookies } from "next/headers";
import { db } from "@/lib/db";
import { customers } from "@/lib/db/schema";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  hasSupabaseAuthCookie,
  safeGetUser,
  safeSignOut,
} from "@/lib/supabase/safe-auth";

export async function getCurrentCustomer() {
  const jar = await cookies();
  if (!hasSupabaseAuthCookie(jar.getAll())) return null;

  const supabase = await createSupabaseServerClient();
  const user = await safeGetUser(supabase);
  if (!user) return null;

  return (
    (await db.query.customers.findFirst({
      where: eq(customers.id, user.id),
    })) ?? null
  );
}

export async function clearCustomerSession() {
  const supabase = await createSupabaseServerClient();
  await safeSignOut(supabase);
}
