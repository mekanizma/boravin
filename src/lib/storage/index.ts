import type { StorageProvider } from "@/lib/storage/types";
import { localStorageProvider } from "@/lib/storage/providers/local";
import { s3StorageProvider } from "@/lib/storage/providers/s3";

export type {
  StorageProvider,
  StorageObject,
  StorageUploadInput,
} from "@/lib/storage/types";

export function getStorageProvider(name?: string): StorageProvider {
  const provider = (
    name ??
    process.env.STORAGE_PROVIDER ??
    "local"
  ).toLowerCase();

  switch (provider) {
    case "s3":
      return s3StorageProvider;
    case "local":
      return localStorageProvider;
    default:
      throw new Error(
        `Unknown STORAGE_PROVIDER "${provider}". Supported: local, s3`,
      );
  }
}
