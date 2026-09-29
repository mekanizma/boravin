"use server";

import { and, desc, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { products, reviews } from "@/lib/db/schema";
import { getCurrentCustomer } from "@/lib/account/session";
import { requirePermission, writeAuditLog } from "@/lib/auth/rbac";
import { REVIEW_STATUS } from "@/features/reviews/constants";

const submitSchema = z.object({
  productId: z.string().uuid(),
  authorName: z.string().trim().min(2).max(120),
  rating: z.coerce.number().int().min(1).max(5),
  title: z.string().trim().max(180).optional().nullable(),
  body: z.string().trim().min(10).max(2000),
});

function revalidateReviewPaths(productSlug?: string | null) {
  revalidatePath("/admin/reviews");
  revalidatePath("/admin");
  if (productSlug) revalidatePath(`/urun/${productSlug}`);
}

async function productSlugFor(productId: string) {
  const product = await db.query.products.findFirst({
    where: eq(products.id, productId),
  });
  return product?.slug ?? null;
}

export async function submitProductReview(raw: z.input<typeof submitSchema>) {
  let data: z.infer<typeof submitSchema>;
  try {
    data = submitSchema.parse(raw);
  } catch {
    return { ok: false as const, error: "VALIDATION" };
  }

  const product = await db.query.products.findFirst({
    where: eq(products.id, data.productId),
  });
  if (!product || product.status !== "active") {
    return { ok: false as const, error: "PRODUCT_NOT_FOUND" };
  }

  const customer = await getCurrentCustomer();

  const [created] = await db
    .insert(reviews)
    .values({
      productId: product.id,
      customerId: customer?.id ?? null,
      authorName: data.authorName.trim(),
      rating: data.rating,
      title: data.title?.trim() || null,
      body: data.body.trim(),
      status: REVIEW_STATUS.pending,
    })
    .returning();

  if (!created) return { ok: false as const, error: "CREATE_FAILED" };

  revalidatePath("/admin/reviews");
  return { ok: true as const, id: created.id };
}

export async function approveReview(id: string) {
  const session = await requirePermission("CONTENT_MANAGE");
  const review = await db.query.reviews.findFirst({
    where: eq(reviews.id, id),
  });
  if (!review) return { ok: false as const, error: "NOT_FOUND" };

  await db
    .update(reviews)
    .set({ status: REVIEW_STATUS.approved, updatedAt: new Date() })
    .where(eq(reviews.id, id));

  await writeAuditLog({
    userId: session.user.id,
    action: "REVIEW_APPROVE",
    entityType: "review",
    entityId: id,
    before: { status: review.status },
    after: { status: REVIEW_STATUS.approved },
  });

  revalidateReviewPaths(await productSlugFor(review.productId));
  return { ok: true as const };
}

export async function rejectReview(id: string) {
  const session = await requirePermission("CONTENT_MANAGE");
  const review = await db.query.reviews.findFirst({
    where: eq(reviews.id, id),
  });
  if (!review) return { ok: false as const, error: "NOT_FOUND" };

  await db
    .update(reviews)
    .set({ status: REVIEW_STATUS.rejected, updatedAt: new Date() })
    .where(eq(reviews.id, id));

  await writeAuditLog({
    userId: session.user.id,
    action: "REVIEW_REJECT",
    entityType: "review",
    entityId: id,
    before: { status: review.status },
    after: { status: REVIEW_STATUS.rejected },
  });

  revalidateReviewPaths(await productSlugFor(review.productId));
  return { ok: true as const };
}

export async function deleteReview(id: string) {
  const session = await requirePermission("CONTENT_MANAGE");
  const review = await db.query.reviews.findFirst({
    where: eq(reviews.id, id),
  });
  if (!review) return { ok: false as const, error: "NOT_FOUND" };

  await db.delete(reviews).where(eq(reviews.id, id));

  await writeAuditLog({
    userId: session.user.id,
    action: "REVIEW_DELETE",
    entityType: "review",
    entityId: id,
    before: { status: review.status, productId: review.productId },
  });

  revalidateReviewPaths(await productSlugFor(review.productId));
  return { ok: true as const };
}

export async function listApprovedProductReviews(productId: string) {
  return db
    .select({
      id: reviews.id,
      authorName: reviews.authorName,
      rating: reviews.rating,
      title: reviews.title,
      body: reviews.body,
      createdAt: reviews.createdAt,
    })
    .from(reviews)
    .where(
      and(
        eq(reviews.productId, productId),
        eq(reviews.status, REVIEW_STATUS.approved),
      ),
    )
    .orderBy(desc(reviews.createdAt))
    .limit(50);
}
