import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db, type AppDatabase } from "@/lib/db";
import { productVariants, products, stockMovements } from "@/lib/db/schema";

export type StockMovementType = "in" | "out" | "adjust" | "sale" | "return";

export class StockError extends Error {
  constructor(
    public code: "NOT_FOUND" | "INSUFFICIENT_STOCK" | "INVALID_QUANTITY",
  ) {
    super(code);
  }
}

type Tx = Parameters<Parameters<AppDatabase["transaction"]>[0]>[0];

export async function applyStockChange(
  input: {
    productId: string;
    variantId?: string | null;
    delta: number;
    type: StockMovementType;
    note?: string | null;
    reference?: string | null;
    userId?: string | null;
  },
  tx?: Tx,
) {
  if (!Number.isInteger(input.delta) || input.delta === 0) {
    throw new StockError("INVALID_QUANTITY");
  }

  const run = async (client: Tx) => {
    if (input.variantId) {
      const variant = await client.query.productVariants.findFirst({
        where: eq(productVariants.id, input.variantId!),
      });
      if (!variant || variant.productId !== input.productId) {
        throw new StockError("NOT_FOUND");
      }
      const stockAfter = variant.stock + input.delta;
      if (stockAfter < 0) throw new StockError("INSUFFICIENT_STOCK");

      await client
        .update(productVariants)
        .set({ stock: stockAfter, updatedAt: new Date() })
        .where(eq(productVariants.id, variant.id));

      const [movement] = await client
        .insert(stockMovements)
        .values({
          productId: input.productId,
          variantId: variant.id,
          type: input.type,
          quantity: input.delta,
          stockBefore: variant.stock,
          stockAfter,
          note: input.note ?? null,
          reference: input.reference ?? null,
          userId: input.userId ?? null,
        })
        .returning();
      return movement;
    }

    const product = await client.query.products.findFirst({
      where: eq(products.id, input.productId),
    });
    if (!product) throw new StockError("NOT_FOUND");

    const stockAfter = product.stock + input.delta;
    if (stockAfter < 0) throw new StockError("INSUFFICIENT_STOCK");

    await client
      .update(products)
      .set({ stock: stockAfter, updatedAt: new Date() })
      .where(eq(products.id, product.id));

    const [movement] = await client
      .insert(stockMovements)
      .values({
        productId: product.id,
        type: input.type,
        quantity: input.delta,
        stockBefore: product.stock,
        stockAfter,
        note: input.note ?? null,
        reference: input.reference ?? null,
        userId: input.userId ?? null,
      })
      .returning();
    return movement;
  };

  const movement = tx ? await run(tx) : await db.transaction(run);
  revalidatePath("/admin/stock");
  revalidatePath("/admin/products");
  revalidatePath("/admin");
  return movement;
}
