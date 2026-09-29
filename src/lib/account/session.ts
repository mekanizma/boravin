import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { customers } from "@/lib/db/schema";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function getCurrentCustomer() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  return (
    (await db.query.customers.findFirst({
      where: eq(customers.id, user.id),
    })) ?? null
  );
}

export async function clearCustomerSession() {
  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut();
}
