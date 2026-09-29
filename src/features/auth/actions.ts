"use server";

import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

export type AdminLoginState = {
  ok: boolean;
  message?: string;
};

export async function loginAdmin(
  _prev: AdminLoginState,
  formData: FormData,
): Promise<AdminLoginState> {
  try {
    const parsed = loginSchema.safeParse({
      email: String(formData.get("email") ?? ""),
      password: String(formData.get("password") ?? ""),
    });
    if (!parsed.success) {
      return { ok: false, message: "Geçerli e-posta ve şifre girin." };
    }

    const email = parsed.data.email.toLowerCase();
    const staff = await db.query.users.findFirst({
      where: eq(users.email, email),
    });
    if (!staff || !staff.isActive) {
      return { ok: false, message: "Geçersiz e-posta veya şifre." };
    }

    const supabase = await createSupabaseServerClient();
    const { data: signInData, error } = await supabase.auth.signInWithPassword({
      email,
      password: parsed.data.password,
    });
    if (error || !signInData.user) {
      return { ok: false, message: "Geçersiz e-posta veya şifre." };
    }

    const authUser = signInData.user;

    // Keep Auth metadata in sync for middleware (`kind=admin`).
    if (authUser.app_metadata?.kind !== "admin") {
      const admin = getSupabaseAdmin();
      await admin.auth.admin.updateUserById(authUser.id, {
        app_metadata: { ...authUser.app_metadata, kind: "admin" },
      });
      await supabase.auth.refreshSession();
    }

    await db
      .update(users)
      .set({ lastLoginAt: new Date(), updatedAt: new Date() })
      .where(eq(users.id, staff.id));

    return { ok: true };
  } catch (error) {
    console.error("[loginAdmin]", error);
    const message =
      error instanceof Error && /Missing |DATABASE|ECONN|SSL|connect/i.test(error.message)
        ? "Sunucu yapılandırması eksik veya veritabanına bağlanılamadı."
        : "Giriş sırasında bir hata oluştu. Lütfen tekrar deneyin.";
    return { ok: false, message };
  }
}
