"use server";

import { eq } from "drizzle-orm";
import { revalidatePath, revalidateTag } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { customers } from "@/lib/db/schema";
import { ensureAccountColumns } from "@/lib/account/columns";
import { requirePermission, writeAuditLog } from "@/lib/auth/rbac";

type ActionResult =
  | { ok: true }
  | { ok: false; error: string };

const discountSchema = z.object({
  customerId: z.string().uuid(),
  discountPercent: z.coerce.number().min(0).max(100),
});

export async function updateCustomerDiscountPercent(
  raw: z.infer<typeof discountSchema>,
): Promise<ActionResult> {
  try {
    const session = await requirePermission("CUSTOMER_EDIT");
    const data = discountSchema.parse(raw);
    await ensureAccountColumns();

    const existing = await db.query.customers.findFirst({
      where: eq(customers.id, data.customerId),
      columns: { id: true, email: true, discountPercent: true },
    });
    if (!existing) {
      return { ok: false, error: "Müşteri bulunamadı." };
    }

    const value = Number(data.discountPercent.toFixed(2));
    await db
      .update(customers)
      .set({
        discountPercent: String(value),
        updatedAt: new Date(),
      })
      .where(eq(customers.id, data.customerId));

    await writeAuditLog({
      userId: session.user.id,
      action: "CUSTOMER_DISCOUNT_UPDATE",
      entityType: "customer",
      entityId: data.customerId,
      before: { discountPercent: existing.discountPercent },
      after: { discountPercent: String(value), email: existing.email },
    });

    revalidatePath("/admin/customers");
    revalidateTag("admin-customers", "max");
    revalidatePath("/sepet");
    revalidatePath("/odeme");
    return { ok: true };
  } catch (e) {
    if (e instanceof z.ZodError) {
      return { ok: false, error: "İndirim oranı 0–100 arasında olmalıdır." };
    }
    if (
      e instanceof Error &&
      (e.message === "UNAUTHORIZED" || e.message === "FORBIDDEN")
    ) {
      return { ok: false, error: "Bu işlem için yetkiniz yok." };
    }
    return { ok: false, error: "İndirim kaydedilemedi." };
  }
}
