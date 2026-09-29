import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import {
  getSupabaseSecretKey,
  getSupabaseUrl,
} from "@/lib/supabase/env";

let adminClient: SupabaseClient | null = null;

/** Service-role client for Auth Admin + privileged server ops. */
export function getSupabaseAdmin() {
  if (!adminClient) {
    adminClient = createClient(getSupabaseUrl(), getSupabaseSecretKey(), {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });
  }
  return adminClient;
}
