import type { StorageProvider } from "@/lib/storage/types";
import { localStorageProvider } from "@/lib/storage/providers/local";
import { s3StorageProvider } from "@/lib/storage/providers/s3";
import { supabaseStorageProvider } from "@/lib/storage/providers/supabase";
import { isSupabaseConfigured } from "@/lib/supabase/env";

export type {
  StorageProvider,
  StorageObject,
  StorageUploadInput,
} from "@/lib/storage/types";

function resolveProviderName(name?: string) {
  const fromEnv = (
    name ??
    process.env.STORAGE_PROVIDER ??
    ""
  )
    .trim()
    .toLowerCase();

  if (fromEnv) return fromEnv;

  // Prefer Supabase Storage when credentials exist and no explicit provider is set.
  if (isSupabaseConfigured()) return "supabase";
  return "local";
}

export function getStorageProvider(name?: string): StorageProvider {
  const provider = resolveProviderName(name);

  switch (provider) {
    case "supabase":
      return supabaseStorageProvider;
    case "s3":
      return s3StorageProvider;
    case "local":
      return localStorageProvider;
    default:
      throw new Error(
        `Unknown STORAGE_PROVIDER "${provider}". Supported: supabase, local, s3`,
      );
  }
}
