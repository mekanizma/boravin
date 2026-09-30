/**
 * Ensure the public Supabase Storage bucket exists (boravin-media by default).
 * Usage: npx tsx scripts/ensure-supabase-storage.ts
 */
import "dotenv/config";
import { getSupabaseAdmin } from "../src/lib/supabase/admin";

const bucket =
  process.env.STORAGE_BUCKET?.trim() ||
  process.env.SUPABASE_STORAGE_BUCKET?.trim() ||
  "boravin-media";

async function main() {
  const admin = getSupabaseAdmin();
  const { data: buckets, error: listError } = await admin.storage.listBuckets();
  if (listError) throw listError;

  const existing = buckets?.find((item) => item.name === bucket);
  if (!existing) {
    const { error } = await admin.storage.createBucket(bucket, {
      public: true,
      fileSizeLimit: 6 * 1024 * 1024,
      allowedMimeTypes: [
        "image/jpeg",
        "image/png",
        "image/webp",
        "image/gif",
        "image/avif",
      ],
    });
    if (error) throw error;
    console.log(`Created public bucket: ${bucket}`);
    return;
  }

  if (!existing.public) {
    const { error } = await admin.storage.updateBucket(bucket, { public: true });
    if (error) throw error;
    console.log(`Updated bucket to public: ${bucket}`);
    return;
  }

  console.log(`Bucket already ready: ${bucket}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
