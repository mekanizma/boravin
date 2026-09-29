import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { permissions, rolePermissions, roles, users } from "@/lib/db/schema";

export async function getUserPermissions(userId: string) {
  const user = await db.query.users.findFirst({
    where: (u, { eq: e }) => e(u.id, userId),
  });

  if (!user?.roleId) {
    return { role: null as string | null, permissions: [] as string[] };
  }

  const rows = await db
    .select({
      code: permissions.code,
      roleCode: roles.code,
    })
    .from(rolePermissions)
    .innerJoin(permissions, eq(rolePermissions.permissionId, permissions.id))
    .innerJoin(roles, eq(rolePermissions.roleId, roles.id))
    .where(eq(rolePermissions.roleId, user.roleId));

  return {
    role: rows[0]?.roleCode ?? null,
    permissions: rows.map((r) => r.code),
  };
}
