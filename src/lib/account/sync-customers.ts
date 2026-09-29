import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { customers } from "@/lib/db/schema";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

type CustomerProfile = {
  id: string;
  email: string;
  firstName?: string | null;
  lastName?: string | null;
  phone?: string | null;
  accountType?: "individual" | "corporate";
  companyName?: string | null;
  companyTitle?: string | null;
  taxOffice?: string | null;
  taxNumber?: string | null;
};

/** Insert customer row if Auth user exists but public.customers is missing. */
export async function ensureCustomerProfile(input: CustomerProfile) {
  const email = input.email.toLowerCase();
  const existingById = await db.query.customers.findFirst({
    where: eq(customers.id, input.id),
  });
  if (existingById) return existingById;

  const existingByEmail = await db.query.customers.findFirst({
    where: eq(customers.email, email),
  });
  if (existingByEmail) return existingByEmail;

  const [created] = await db
    .insert(customers)
    .values({
      id: input.id,
      email,
      passwordHash: null,
      firstName: input.firstName ?? null,
      lastName: input.lastName ?? null,
      phone: input.phone ?? null,
      accountType: input.accountType ?? "individual",
      companyName: input.companyName ?? null,
      companyTitle: input.companyTitle ?? null,
      taxOffice: input.taxOffice ?? null,
      taxNumber: input.taxNumber ?? null,
      segment: "new",
    })
    .onConflictDoNothing()
    .returning();

  if (created) return created;

  return (
    (await db.query.customers.findFirst({
      where: eq(customers.id, input.id),
    })) ??
    (await db.query.customers.findFirst({
      where: eq(customers.email, email),
    })) ??
    null
  );
}

/** Pull Auth users with kind=customer into public.customers. */
export async function syncCustomersFromAuth() {
  const admin = getSupabaseAdmin();
  let page = 1;
  let synced = 0;

  for (;;) {
    const listed = await admin.auth.admin.listUsers({ page, perPage: 100 });
    const batch = listed.data.users;
    if (!batch.length) break;

    for (const user of batch) {
      if (!user.email) continue;
      if (user.app_metadata?.kind === "admin") continue;
      // Treat non-admin Auth users as customers (including missing kind).
      if (
        user.app_metadata?.kind != null &&
        user.app_metadata.kind !== "customer"
      ) {
        continue;
      }

      const meta = user.user_metadata ?? {};
      const row = await ensureCustomerProfile({
        id: user.id,
        email: user.email,
        firstName:
          typeof meta.firstName === "string"
            ? meta.firstName
            : typeof meta.first_name === "string"
              ? meta.first_name
              : null,
        lastName:
          typeof meta.lastName === "string"
            ? meta.lastName
            : typeof meta.last_name === "string"
              ? meta.last_name
              : null,
        phone: typeof meta.phone === "string" ? meta.phone : null,
        accountType:
          meta.accountType === "corporate" ? "corporate" : "individual",
        companyName:
          typeof meta.companyName === "string" ? meta.companyName : null,
        companyTitle:
          typeof meta.companyTitle === "string" ? meta.companyTitle : null,
        taxOffice: typeof meta.taxOffice === "string" ? meta.taxOffice : null,
        taxNumber: typeof meta.taxNumber === "string" ? meta.taxNumber : null,
      });
      if (row) synced += 1;
    }

    if (batch.length < 100) break;
    page += 1;
  }

  return synced;
}
