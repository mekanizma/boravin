"use server";

import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/lib/db";
import { customers } from "@/lib/db/schema";
import { clearCustomerSession } from "@/lib/account/session";
import { ensureCustomerProfile } from "@/lib/account/sync-customers";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const passwordSchema = z.string().min(6, "Şifre en az 6 karakter olmalı");

const individualSchema = z
  .object({
    accountType: z.literal("individual"),
    firstName: z.string().trim().min(2, "İsim girin"),
    lastName: z.string().trim().min(2, "Soyisim girin"),
    phone: z.string().trim().min(7, "Telefon girin"),
    email: z.string().trim().email("Geçerli bir e-posta girin"),
    password: passwordSchema,
    passwordConfirm: z.string(),
  })
  .refine((data) => data.password === data.passwordConfirm, {
    path: ["passwordConfirm"],
    message: "Şifreler eşleşmiyor",
  });

const corporateSchema = z
  .object({
    accountType: z.literal("corporate"),
    companyName: z.string().trim().optional(),
    companyTitle: z.string().trim().min(2, "Firma ünvanı girin"),
    taxOffice: z.string().trim().min(2, "Vergi dairesi girin"),
    taxNumber: z.string().trim().min(3, "Vergi numarası girin"),
    firstName: z.string().trim().min(2, "İsim girin"),
    lastName: z.string().trim().min(2, "Soyisim girin"),
    phone: z.string().trim().min(7, "Telefon girin"),
    email: z.string().trim().email("Geçerli bir e-posta girin"),
    password: passwordSchema,
    passwordConfirm: z.string(),
  })
  .refine((data) => data.password === data.passwordConfirm, {
    path: ["passwordConfirm"],
    message: "Şifreler eşleşmiyor",
  });

export type RegisterState = {
  ok: boolean;
  message?: string;
  fieldErrors?: Record<string, string>;
};

function read(formData: FormData, key: string) {
  return String(formData.get(key) ?? "");
}

export async function registerAccount(
  _prev: RegisterState,
  formData: FormData,
): Promise<RegisterState> {
  const accountType =
    read(formData, "accountType") === "corporate" ? "corporate" : "individual";
  const parsed =
    accountType === "corporate"
      ? corporateSchema.safeParse({
          accountType,
          companyName: read(formData, "companyName"),
          companyTitle: read(formData, "companyTitle"),
          taxOffice: read(formData, "taxOffice"),
          taxNumber: read(formData, "taxNumber"),
          firstName: read(formData, "firstName"),
          lastName: read(formData, "lastName"),
          phone: read(formData, "phone"),
          email: read(formData, "email"),
          password: read(formData, "password"),
          passwordConfirm: read(formData, "passwordConfirm"),
        })
      : individualSchema.safeParse({
          accountType,
          firstName: read(formData, "firstName"),
          lastName: read(formData, "lastName"),
          phone: read(formData, "phone"),
          email: read(formData, "email"),
          password: read(formData, "password"),
          passwordConfirm: read(formData, "passwordConfirm"),
        });

  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const key = String(issue.path[0] ?? "form");
      if (!fieldErrors[key]) fieldErrors[key] = issue.message;
    }
    return { ok: false, fieldErrors, message: "Eksik veya hatalı alanlar var." };
  }

  const data = parsed.data;
  const email = data.email.toLowerCase();

  try {
    const existing = await db.query.customers.findFirst({
      where: eq(customers.email, email),
    });
    if (existing) {
      return { ok: false, message: "Bu e-posta ile kayıtlı bir hesap var." };
    }

    const admin = getSupabaseAdmin();
    const { data: createdAuth, error: createError } =
      await admin.auth.admin.createUser({
        email,
        password: data.password,
        email_confirm: true,
        user_metadata: {
          kind: "customer",
          accountType,
          firstName: data.firstName,
          lastName: data.lastName,
          phone: data.phone,
          companyName:
            data.accountType === "corporate" ? data.companyName || null : null,
          companyTitle:
            data.accountType === "corporate" ? data.companyTitle : null,
          taxOffice: data.accountType === "corporate" ? data.taxOffice : null,
          taxNumber: data.accountType === "corporate" ? data.taxNumber : null,
        },
        app_metadata: { kind: "customer" },
      });

    if (createError || !createdAuth.user) {
      const msg = createError?.message ?? "";
      if (msg.toLowerCase().includes("already")) {
        return { ok: false, message: "Bu e-posta ile kayıtlı bir hesap var." };
      }
      return { ok: false, message: "Kayıt tamamlanamadı. Lütfen tekrar deneyin." };
    }

    try {
      const profile = await ensureCustomerProfile({
        id: createdAuth.user.id,
        email,
        firstName: data.firstName,
        lastName: data.lastName,
        phone: data.phone,
        accountType,
        companyName:
          data.accountType === "corporate" ? data.companyName || null : null,
        companyTitle:
          data.accountType === "corporate" ? data.companyTitle : null,
        taxOffice: data.accountType === "corporate" ? data.taxOffice : null,
        taxNumber: data.accountType === "corporate" ? data.taxNumber : null,
      });
      if (!profile) {
        throw new Error("Customer profile was not created");
      }
    } catch (insertError) {
      await admin.auth.admin.deleteUser(createdAuth.user.id);
      const text = insertError instanceof Error ? insertError.message : "";
      console.error("[registerAccount] customer insert failed", insertError);
      if (text.includes("customers_email") || text.includes("23505")) {
        return { ok: false, message: "Bu e-posta ile kayıtlı bir hesap var." };
      }
      return { ok: false, message: "Kayıt tamamlanamadı. Lütfen tekrar deneyin." };
    }

    const supabase = await createSupabaseServerClient();
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password: data.password,
    });
    if (signInError) {
      return {
        ok: false,
        message: "Hesap oluştu ancak giriş yapılamadı. Lütfen giriş yapın.",
      };
    }
  } catch (error) {
    console.error("[registerAccount]", error);
    return { ok: false, message: "Kayıt tamamlanamadı. Lütfen tekrar deneyin." };
  }

  redirect("/hesabim");
}

const loginSchema = z.object({
  accountType: z.enum(["individual", "corporate"]),
  email: z.string().trim().email("Geçerli bir e-posta girin"),
  password: z.string().min(1, "Şifre girin"),
});

export async function loginAccount(
  _prev: RegisterState,
  formData: FormData,
): Promise<RegisterState> {
  const accountType =
    read(formData, "accountType") === "corporate" ? "corporate" : "individual";
  const parsed = loginSchema.safeParse({
    accountType,
    email: read(formData, "email"),
    password: read(formData, "password"),
  });
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const key = String(issue.path[0] ?? "form");
      if (!fieldErrors[key]) fieldErrors[key] = issue.message;
    }
    return { ok: false, fieldErrors, message: "E-posta ve şifre gerekli." };
  }

  try {
    const email = parsed.data.email.toLowerCase();
    const supabase = await createSupabaseServerClient();
    const { data: signInData, error } = await supabase.auth.signInWithPassword({
      email,
      password: parsed.data.password,
    });
    if (error || !signInData.user) {
      return { ok: false, message: "E-posta veya şifre hatalı." };
    }

    const authUser = signInData.user;
    if (authUser.app_metadata?.kind === "admin") {
      await supabase.auth.signOut();
      return { ok: false, message: "E-posta veya şifre hatalı." };
    }

    const meta = authUser.user_metadata ?? {};
    const customer = await ensureCustomerProfile({
      id: authUser.id,
      email,
      firstName:
        typeof meta.firstName === "string"
          ? meta.firstName
          : typeof meta.first_name === "string"
            ? meta.first_name
            : null,
      lastName:
        typeof meta.lastName === "string"
          ? meta.lastName
          : typeof meta.last_name === "string"
            ? meta.last_name
            : null,
      phone: typeof meta.phone === "string" ? meta.phone : null,
      accountType:
        meta.accountType === "corporate" || accountType === "corporate"
          ? "corporate"
          : "individual",
      companyName:
        typeof meta.companyName === "string" ? meta.companyName : null,
      companyTitle:
        typeof meta.companyTitle === "string" ? meta.companyTitle : null,
      taxOffice: typeof meta.taxOffice === "string" ? meta.taxOffice : null,
      taxNumber: typeof meta.taxNumber === "string" ? meta.taxNumber : null,
    });

    if (!customer) {
      await supabase.auth.signOut();
      return { ok: false, message: "E-posta veya şifre hatalı." };
    }

    const storedType =
      customer.accountType === "corporate" ? "corporate" : "individual";
    if (storedType !== accountType) {
      await supabase.auth.signOut();
      return {
        ok: false,
        message:
          storedType === "corporate"
            ? "Bu hesap kurumsal. Kurumsal girişi seçin."
            : "Bu hesap bireysel. Bireysel girişi seçin.",
      };
    }
  } catch (error) {
    console.error("[loginAccount]", error);
    return { ok: false, message: "Giriş yapılamadı. Lütfen tekrar deneyin." };
  }

  redirect("/hesabim");
}

export async function logoutAccount() {
  await clearCustomerSession();
  redirect("/uye-ol");
}
