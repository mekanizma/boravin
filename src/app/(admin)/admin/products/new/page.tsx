import { asc, eq } from "drizzle-orm";
import { NewProductForm } from "@/components/admin/new-product-form";
import { getDb, isTransientDbError, recoverDb } from "@/lib/db";
import { brands, categories } from "@/lib/db/schema";

async function queryOptions() {
  const database = getDb();
  const [categoryRows, brandRows] = await Promise.all([
    database
      .select({
        id: categories.id,
        name: categories.name,
        parentId: categories.parentId,
        sortOrder: categories.sortOrder,
      })
      .from(categories)
      .where(eq(categories.isActive, true))
      .orderBy(asc(categories.sortOrder), asc(categories.name)),
    database
      .select({ id: brands.id, name: brands.name })
      .from(brands)
      .where(eq(brands.isActive, true))
      .orderBy(asc(brands.name)),
  ]);
  const byId = new Map(categoryRows.map((row) => [row.id, row]));
  return {
    categories: categoryRows.map((row) => {
      const parent = row.parentId ? byId.get(row.parentId) : undefined;
      return {
        id: row.id,
        label: parent ? `${parent.name} / ${row.name}` : row.name,
      };
    }),
    brands: brandRows,
  };
}

async function loadOptions() {
  try {
    return await queryOptions();
  } catch (error) {
    if (!isTransientDbError(error)) return { categories: [], brands: [] };
    try {
      await recoverDb();
      return await queryOptions();
    } catch {
      return { categories: [], brands: [] };
    }
  }
}

export default async function AdminNewProductPage() {
  const options = await loadOptions();
  return <NewProductForm categories={options.categories} brands={options.brands} />;
}
