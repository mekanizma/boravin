import { mkdir, writeFile, unlink } from "fs/promises";
import path from "path";
import { nanoid } from "nanoid";
import type { StorageProvider, StorageUploadInput } from "../types";
import { getUploadsRoot } from "@/lib/storage/uploads-path";

function publicUrlForKey(key: string) {
  const base = process.env.STORAGE_PUBLIC_URL?.trim().replace(/\/$/, "");
  if (base) return `${base}/${key}`;
  return `/uploads/${key}`;
}

export const localStorageProvider: StorageProvider = {
  name: "local",
  async upload(input: StorageUploadInput) {
    const folder = input.folder ?? "general";
    const ext = path.extname(input.filename) || "";
    const key = `${folder}/${nanoid(12)}${ext}`;
    const fullPath = path.join(/*turbopackIgnore: true*/ getUploadsRoot(), key);
    await mkdir(path.dirname(fullPath), { recursive: true });
    await writeFile(fullPath, input.body);
    return {
      key,
      url: publicUrlForKey(key),
      size: input.body.byteLength,
      contentType: input.contentType,
    };
  },
  async delete(key: string) {
    const fullPath = path.join(/*turbopackIgnore: true*/ getUploadsRoot(), key);
    await unlink(fullPath).catch(() => undefined);
  },
};
