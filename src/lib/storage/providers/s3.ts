import type {
  StorageObject,
  StorageProvider,
  StorageUploadInput,
} from "@/lib/storage/types";

/** Stub — wire AWS SDK / S3-compatible client with STORAGE_* env vars. */
export class S3StorageProvider implements StorageProvider {
  readonly name = "s3";

  async upload(input: StorageUploadInput): Promise<StorageObject> {
    void input;
    throw new Error(
      "S3 storage provider is not implemented. Set STORAGE_PROVIDER=local.",
    );
  }

  async delete(key: string): Promise<void> {
    void key;
    throw new Error(
      "S3 storage provider is not implemented. Set STORAGE_PROVIDER=local.",
    );
  }
}

export const s3StorageProvider = new S3StorageProvider();
