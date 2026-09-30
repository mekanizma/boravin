import { nanoid } from "nanoid";
import path from "path";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import type {
  StorageObject,
  StorageProvider,
  StorageUploadInput,
} from "@/lib/storage/types";

function bucketName() {
  return (
    process.env.STORAGE_BUCKET?.trim() ||
    process.env.SUPABASE_STORAGE_BUCKET?.trim() ||
    "boravin-media"
  );
}

let bucketReady: Promise<void> | null = null;

async function ensurePublicBucket() {
  if (!bucketReady) {
    bucketReady = (async () => {
      const name = bucketName();
      const admin = getSupabaseAdmin();
      const { data: buckets, error: listError } = await admin.storage.listBuckets();
      if (listError) {
        throw new Error(`Supabase Storage bucket list failed: ${listError.message}`);
      }

      const existing = buckets?.find((bucket) => bucket.name === name);
      if (!existing) {
        const { error } = await admin.storage.createBucket(name, {
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
        if (error && !/already exists|duplicate/i.test(error.message)) {
          throw new Error(`Supabase Storage createBucket failed: ${error.message}`);
        }
        return;
      }

      if (!existing.public) {
        const { error } = await admin.storage.updateBucket(name, { public: true });
        if (error) {
          throw new Error(`Supabase Storage updateBucket failed: ${error.message}`);
        }
      }
    })().catch((error) => {
      bucketReady = null;
      throw error;
    });
  }
  await bucketReady;
}

function toUploadBody(body: Buffer | Uint8Array) {
  // Supabase JS accepts Blob/ArrayBuffer/File/FormData/ReadableStream.
  // Copy into a plain ArrayBuffer-backed Uint8Array for Node Buffer compatibility.
  return body instanceof Uint8Array
    ? new Uint8Array(body)
    : new Uint8Array(body);
}

export const supabaseStorageProvider: StorageProvider = {
  name: "supabase",

  async upload(input: StorageUploadInput): Promise<StorageObject> {
    await ensurePublicBucket();
    const admin = getSupabaseAdmin();
    const bucket = bucketName();
    const folder = (input.folder ?? "general").replace(/^\/+|\/+$/g, "") || "general";
    const ext = path.extname(input.filename) || "";
    const key = `${folder}/${nanoid(12)}${ext}`;

    const { error } = await admin.storage.from(bucket).upload(key, toUploadBody(input.body), {
      contentType: input.contentType || "application/octet-stream",
      cacheControl: "31536000",
      upsert: false,
    });

    if (error) {
      throw new Error(`Supabase Storage upload failed: ${error.message}`);
    }

    const { data } = admin.storage.from(bucket).getPublicUrl(key);
    if (!data?.publicUrl) {
      throw new Error("Supabase Storage public URL could not be resolved.");
    }

    return {
      key,
      url: data.publicUrl,
      size: input.body.byteLength,
      contentType: input.contentType,
    };
  },

  async delete(key: string): Promise<void> {
    const admin = getSupabaseAdmin();
    const bucket = bucketName();
    const { error } = await admin.storage.from(bucket).remove([key]);
    if (error) {
      throw new Error(`Supabase Storage delete failed: ${error.message}`);
    }
  },
};
