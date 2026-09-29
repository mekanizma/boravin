export type StorageUploadInput = {
  filename: string;
  contentType: string;
  body: Buffer | Uint8Array;
  folder?: string;
};

export type StorageObject = {
  key: string;
  url: string;
  size: number;
  contentType: string;
};

export interface StorageProvider {
  name: string;
  upload(input: StorageUploadInput): Promise<StorageObject>;
  delete(key: string): Promise<void>;
}
