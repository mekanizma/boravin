import { db } from "@/lib/db";
import { auditLogs } from "@/lib/db/schema";
import type { PermissionCode } from "@/lib/auth/permissions";
import { auth } from "@/lib/auth";

export { getUserPermissions } from "@/lib/auth/permissions-query";

export async function requireSession() {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error("UNAUTHORIZED");
  }
  return session;
}

export async function requirePermission(permission: PermissionCode) {
  const session = await requireSession();
  const userPermissions = session.user.permissions ?? [];
  const role = session.user.role;
  if (role === "SUPER_ADMIN") return session;
  if (!userPermissions.includes(permission)) {
    throw new Error("FORBIDDEN");
  }
  return session;
}

export async function writeAuditLog(input: {
  userId?: string | null;
  action: string;
  entityType: string;
  entityId?: string;
  before?: unknown;
  after?: unknown;
  ip?: string;
}) {
  await db.insert(auditLogs).values({
    userId: input.userId ?? null,
    action: input.action,
    entityType: input.entityType,
    entityId: input.entityId,
    before: input.before as Record<string, unknown> | undefined,
    after: input.after as Record<string, unknown> | undefined,
    ip: input.ip,
  });
}
