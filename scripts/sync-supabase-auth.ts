import { config } from "dotenv";
config({ path: ".env.local" });
config();

import { eq } from "drizzle-orm";
import { closeDb, db } from "../src/lib/db";
import { roles, users } from "../src/lib/db/schema";
import { getSupabaseAdmin } from "../src/lib/supabase/admin";

const ADMIN_EMAIL = "admin@boravin.com";
const ADMIN_PASSWORD = "Admin123!";
const ADMIN_NAME = "Boravin Admin";

async function main() {
  const admin = getSupabaseAdmin();
  const staff = await db.query.users.findFirst({
    where: eq(users.email, ADMIN_EMAIL),
  });
  if (!staff) {
    throw new Error(`No staff row for ${ADMIN_EMAIL}. Run npm run db:seed first.`);
  }

  const role =
    staff.roleId != null
      ? await db.query.roles.findFirst({ where: eq(roles.id, staff.roleId) })
      : null;

  const listed = await admin.auth.admin.listUsers({ page: 1, perPage: 200 });
  let authUser = listed.data.users.find(
    (u) => u.email?.toLowerCase() === ADMIN_EMAIL,
  );

  if (!authUser) {
    const created = await admin.auth.admin.createUser({
      email: ADMIN_EMAIL,
      password: ADMIN_PASSWORD,
      email_confirm: true,
      user_metadata: { name: ADMIN_NAME, kind: "admin" },
      app_metadata: { kind: "admin", role: role?.code ?? "SUPER_ADMIN" },
    });
    if (created.error || !created.data.user) {
      throw created.error ?? new Error("Failed to create auth admin");
    }
    authUser = created.data.user;
    console.log("Created Supabase Auth user", authUser.id);
  } else {
    const updated = await admin.auth.admin.updateUserById(authUser.id, {
      password: ADMIN_PASSWORD,
      email_confirm: true,
      user_metadata: { name: ADMIN_NAME, kind: "admin" },
      app_metadata: { kind: "admin", role: role?.code ?? "SUPER_ADMIN" },
    });
    if (updated.error || !updated.data.user) {
      throw updated.error ?? new Error("Failed to update auth admin");
    }
    authUser = updated.data.user;
    console.log("Updated Supabase Auth user", authUser.id);
  }

  if (staff.id === authUser.id) {
    await db
      .update(users)
      .set({
        passwordHash: null,
        name: ADMIN_NAME,
        isActive: true,
        updatedAt: new Date(),
      })
      .where(eq(users.id, staff.id));
    console.log("Staff row already linked to Auth id");
  } else {
    await db.delete(users).where(eq(users.id, staff.id));
    await db.insert(users).values({
      id: authUser.id,
      email: ADMIN_EMAIL,
      name: ADMIN_NAME,
      passwordHash: null,
      roleId: staff.roleId,
      isActive: true,
    });
    console.log("Relinked staff row", staff.id, "→", authUser.id);
  }

  console.log("OK", { email: ADMIN_EMAIL, password: ADMIN_PASSWORD });
  await closeDb();
}

main().catch(async (error) => {
  console.error(error);
  await closeDb().catch(() => undefined);
  process.exit(1);
});
