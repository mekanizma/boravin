"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { productVariants, products, users } from "@/lib/db/schema";
import { requirePermission, writeAuditLog } from "@/lib/auth/rbac";
import { StockError, applyStockChange } from "@/lib/stock/apply";

const adjustSchema = z.object({
  productId: z.string().uuid(),
  variantId: z.string().uuid().optional().nullable(),
  mode: z.enum(["in", "out", "set"]),
  quantity: z.coerce.number().int(),
  note: z.string().max(300).optional(),
  minStock: z.coerce.number().int().nonnegative().optional(),
});

export async function adjustStock(raw: z.infer<typeof adjustSchema>) {
  try {
    const session = await requirePermission("PRODUCT_EDIT");
    const user = await db.query.users.findFirst({
      where: eq(users.id, session.user.id),
    });
    const userId = user?.id ?? null;
    const data = adjustSchema.parse(raw);
    const product = await db.query.products.findFirst({
      where: eq(products.id, data.productId),
    });
    if (!product) return { ok: false as const, error: "NOT_FOUND" };

    const variants = data.variantId
      ? await db.query.productVariants.findMany({
          where: eq(productVariants.productId, product.id),
        })
      : [];
    const target = data.variantId
      ? variants.find((variant) => variant.id === data.variantId)
      : null;
    if (data.variantId && !target) return { ok: false as const, error: "NOT_FOUND" };

    const current = target ? target.stock : product.stock;
    let delta = 0;
    let type: "in" | "out" | "adjust" = "adjust";

    if (data.mode === "set") {
      if (data.quantity < 0) return { ok: false as const, error: "INVALID_QUANTITY" };
      delta = data.quantity - current;
      type = "adjust";
    } else {
      if (data.quantity <= 0) return { ok: false as const, error: "INVALID_QUANTITY" };
      delta = data.mode === "in" ? data.quantity : -data.quantity;
      type = data.mode;
    }

    const movement =
      delta === 0
        ? null
        : await applyStockChange({
            productId: product.id,
            variantId: target?.id,
            delta,
            type,
            note: data.note?.trim() || null,
            userId,
          });

    if (data.minStock != null && data.minStock !== product.minStock) {
      await db
        .update(products)
        .set({ minStock: data.minStock, updatedAt: new Date() })
        .where(eq(products.id, product.id));
    }

    await writeAuditLog({
      userId,
      action: "STOCK_ADJUST",
      entityType: "product",
      entityId: product.id,
      before: { stock: current, minStock: product.minStock },
      after: {
        stock: current + delta,
        minStock: data.minStock ?? product.minStock,
        movementId: movement?.id,
      },
    });

    revalidatePath("/admin/stock");
    return { ok: true as const, stockAfter: current + delta };
  } catch (error) {
    if (error instanceof StockError) {
      return { ok: false as const, error: error.code };
    }
    throw error;
  }
}
