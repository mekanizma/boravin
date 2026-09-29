"use server";

import { and, desc, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { addresses, customers } from "@/lib/db/schema";
import {
  clearCustomerSession,
  getCurrentCustomer,
} from "@/lib/account/session";
import { ensureCustomerProfile } from "@/lib/account/sync-customers";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export type RegisterState = {
  ok: boolean;
  message?: string;
  fieldErrors?: Record<string, string>;
};

function read(formData: FormData, key: string) {
  return String(formData.get(key) ?? "");
}

async function authSchemas() {
  const t = await getTranslations("Auth");
  const passwordSchema = z.string().min(6, t("passwordMin"));

  const individualSchema = z
    .object({
      accountType: z.literal("individual"),
      firstName: z.string().trim().min(2, t("firstNameRequired")),
      lastName: z.string().trim().min(2, t("lastNameRequired")),
      phone: z.string().trim().min(7, t("phoneRequired")),
      email: z.string().trim().email(t("emailInvalid")),
      password: passwordSchema,
      passwordConfirm: z.string(),
    })
    .refine((data) => data.password === data.passwordConfirm, {
      path: ["passwordConfirm"],
      message: t("passwordMismatch"),
    });

  const corporateSchema = z
    .object({
      accountType: z.literal("corporate"),
      companyName: z.string().trim().optional(),
      companyTitle: z.string().trim().min(2, t("companyTitleRequired")),
      taxOffice: z.string().trim().min(2, t("taxOfficeRequired")),
      taxNumber: z.string().trim().min(3, t("taxNumberRequired")),
      firstName: z.string().trim().min(2, t("firstNameRequired")),
      lastName: z.string().trim().min(2, t("lastNameRequired")),
      phone: z.string().trim().min(7, t("phoneRequired")),
      email: z.string().trim().email(t("emailInvalid")),
      password: passwordSchema,
      passwordConfirm: z.string(),
    })
    .refine((data) => data.password === data.passwordConfirm, {
      path: ["passwordConfirm"],
      message: t("passwordMismatch"),
    });

  const loginSchema = z.object({
    accountType: z.enum(["individual", "corporate"]),
    email: z.string().trim().email(t("emailInvalid")),
    password: z.string().min(1, t("passwordRequired")),
  });

  return { t, individualSchema, corporateSchema, loginSchema };
}

export async function registerAccount(
  _prev: RegisterState,
  formData: FormData,
): Promise<RegisterState> {
  const { t, individualSchema, corporateSchema } = await authSchemas();
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
    return { ok: false, fieldErrors, message: t("fieldsInvalid") };
  }

  const data = parsed.data;
  const email = data.email.toLowerCase();

  try {
    const existing = await db.query.customers.findFirst({
      where: eq(customers.email, email),
    });
    if (existing) {
      return { ok: false, message: t("emailExists") };
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
        return { ok: false, message: t("emailExists") };
      }
      return { ok: false, message: t("registerFailed") };
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
        return { ok: false, message: t("emailExists") };
      }
      return { ok: false, message: t("registerFailed") };
    }

    const supabase = await createSupabaseServerClient();
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password: data.password,
    });
    if (signInError) {
      return {
        ok: false,
        message: t("registerOkLoginFailed"),
      };
    }
  } catch (error) {
    console.error("[registerAccount]", error);
    return { ok: false, message: t("registerFailed") };
  }

  redirect("/hesabim");
}

export async function loginAccount(
  _prev: RegisterState,
  formData: FormData,
): Promise<RegisterState> {
  const { t, loginSchema } = await authSchemas();
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
    return { ok: false, fieldErrors, message: t("emailPasswordRequired") };
  }

  try {
    const email = parsed.data.email.toLowerCase();
    const supabase = await createSupabaseServerClient();
    const { data: signInData, error } = await supabase.auth.signInWithPassword({
      email,
      password: parsed.data.password,
    });
    if (error || !signInData.user) {
      return { ok: false, message: t("badCredentials") };
    }

    const authUser = signInData.user;
    if (authUser.app_metadata?.kind === "admin") {
      await supabase.auth.signOut();
      return { ok: false, message: t("badCredentials") };
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
      return { ok: false, message: t("badCredentials") };
    }

    const storedType =
      customer.accountType === "corporate" ? "corporate" : "individual";
    if (storedType !== accountType) {
      await supabase.auth.signOut();
      return {
        ok: false,
        message:
          storedType === "corporate"
            ? t("wrongCorporate")
            : t("wrongIndividual"),
      };
    }
  } catch (error) {
    console.error("[loginAccount]", error);
    return { ok: false, message: t("loginFailed") };
  }

  redirect("/hesabim");
}

export async function logoutAccount() {
  await clearCustomerSession();
  redirect("/uye-ol");
}

export type ProfileState = {
  ok: boolean;
  message?: string;
  fieldErrors?: Record<string, string>;
};

export type AddressState = {
  ok: boolean;
  message?: string;
  fieldErrors?: Record<string, string>;
};

function revalidateAccountPaths() {
  revalidatePath("/hesabim");
  revalidatePath("/odeme");
}

export async function updateCustomerProfile(
  _prev: ProfileState,
  formData: FormData,
): Promise<ProfileState> {
  const t = await getTranslations("Account");
  const customer = await getCurrentCustomer();
  if (!customer) {
    return { ok: false, message: t("sessionExpired") };
  }

  const corporate = customer.accountType === "corporate";

  function fieldErrorsFrom(error: z.ZodError) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of error.issues) {
      const key = String(issue.path[0] ?? "form");
      if (!fieldErrors[key]) fieldErrors[key] = issue.message;
    }
    return fieldErrors;
  }

  try {
    if (corporate) {
      const parsed = z
        .object({
          firstName: z.string().trim().min(2, t("firstNameRequired")),
          lastName: z.string().trim().min(2, t("lastNameRequired")),
          phone: z.string().trim().min(7, t("phoneRequired")),
          companyName: z.string().trim().optional(),
          companyTitle: z.string().trim().min(2, t("companyTitleRequired")),
          taxOffice: z.string().trim().min(2, t("taxOfficeRequired")),
          taxNumber: z.string().trim().min(3, t("taxNumberRequired")),
        })
        .safeParse({
          firstName: read(formData, "firstName"),
          lastName: read(formData, "lastName"),
          phone: read(formData, "phone"),
          companyName: read(formData, "companyName"),
          companyTitle: read(formData, "companyTitle"),
          taxOffice: read(formData, "taxOffice"),
          taxNumber: read(formData, "taxNumber"),
        });
      if (!parsed.success) {
        return {
          ok: false,
          fieldErrors: fieldErrorsFrom(parsed.error),
          message: t("fieldsInvalid"),
        };
      }
      const data = parsed.data;
      await db
        .update(customers)
        .set({
          firstName: data.firstName,
          lastName: data.lastName,
          phone: data.phone,
          companyName: data.companyName || null,
          companyTitle: data.companyTitle,
          taxOffice: data.taxOffice,
          taxNumber: data.taxNumber,
          updatedAt: new Date(),
        })
        .where(eq(customers.id, customer.id));
      const supabase = await createSupabaseServerClient();
      await supabase.auth.updateUser({
        data: {
          firstName: data.firstName,
          lastName: data.lastName,
          phone: data.phone,
          companyName: data.companyName || null,
          companyTitle: data.companyTitle,
          taxOffice: data.taxOffice,
          taxNumber: data.taxNumber,
        },
      });
    } else {
      const parsed = z
        .object({
          firstName: z.string().trim().min(2, t("firstNameRequired")),
          lastName: z.string().trim().min(2, t("lastNameRequired")),
          phone: z.string().trim().min(7, t("phoneRequired")),
        })
        .safeParse({
          firstName: read(formData, "firstName"),
          lastName: read(formData, "lastName"),
          phone: read(formData, "phone"),
        });
      if (!parsed.success) {
        return {
          ok: false,
          fieldErrors: fieldErrorsFrom(parsed.error),
          message: t("fieldsInvalid"),
        };
      }
      const data = parsed.data;
      await db
        .update(customers)
        .set({
          firstName: data.firstName,
          lastName: data.lastName,
          phone: data.phone,
          updatedAt: new Date(),
        })
        .where(eq(customers.id, customer.id));
      const supabase = await createSupabaseServerClient();
      await supabase.auth.updateUser({
        data: {
          firstName: data.firstName,
          lastName: data.lastName,
          phone: data.phone,
        },
      });
    }
  } catch (error) {
    console.error("[updateCustomerProfile]", error);
    return { ok: false, message: t("profileSaveFailed") };
  }

  revalidateAccountPaths();
  return { ok: true, message: t("profileSaved") };
}

export async function listCustomerAddresses() {
  const customer = await getCurrentCustomer();
  if (!customer) return [];
  return db.query.addresses.findMany({
    where: eq(addresses.customerId, customer.id),
    orderBy: [desc(addresses.isDefault), desc(addresses.updatedAt)],
  });
}

export async function saveCustomerAddress(
  _prev: AddressState,
  formData: FormData,
): Promise<AddressState> {
  const t = await getTranslations("Account");
  const customer = await getCurrentCustomer();
  if (!customer) return { ok: false, message: t("sessionExpired") };

  const id = read(formData, "id") || null;
  const parsed = z
    .object({
      title: z.string().trim().max(80).optional(),
      fullName: z.string().trim().min(2, t("fullNameRequired")),
      phone: z.string().trim().min(7, t("phoneRequired")),
      line1: z.string().trim().min(3, t("line1Required")),
      line2: z.string().trim().optional(),
      city: z.string().trim().min(2, t("cityRequired")),
      district: z.string().trim().optional(),
      postalCode: z.string().trim().optional(),
      isDefault: z.boolean().optional(),
    })
    .safeParse({
      title: read(formData, "title") || undefined,
      fullName: read(formData, "fullName"),
      phone: read(formData, "phone"),
      line1: read(formData, "line1"),
      line2: read(formData, "line2") || undefined,
      city: read(formData, "city"),
      district: read(formData, "district") || undefined,
      postalCode: read(formData, "postalCode") || undefined,
      isDefault:
        read(formData, "isDefault") === "on" ||
        read(formData, "isDefault") === "true",
    });

  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const key = String(issue.path[0] ?? "form");
      if (!fieldErrors[key]) fieldErrors[key] = issue.message;
    }
    return { ok: false, fieldErrors, message: t("fieldsInvalid") };
  }

  const data = parsed.data;
  try {
    const existing = await db.query.addresses.findMany({
      where: eq(addresses.customerId, customer.id),
    });
    const makeDefault = Boolean(data.isDefault) || existing.length === 0;

    if (makeDefault && existing.length > 0) {
      await db
        .update(addresses)
        .set({ isDefault: false, updatedAt: new Date() })
        .where(eq(addresses.customerId, customer.id));
    }

    if (id) {
      const owned = existing.find((a) => a.id === id);
      if (!owned) return { ok: false, message: t("addressNotFound") };
      await db
        .update(addresses)
        .set({
          title: data.title || null,
          fullName: data.fullName,
          phone: data.phone,
          line1: data.line1,
          line2: data.line2 || null,
          city: data.city,
          district: data.district || null,
          postalCode: data.postalCode || null,
          country: "CY",
          isDefault: makeDefault,
          updatedAt: new Date(),
        })
        .where(eq(addresses.id, id));
    } else {
      await db.insert(addresses).values({
        customerId: customer.id,
        title: data.title || null,
        fullName: data.fullName,
        phone: data.phone,
        line1: data.line1,
        line2: data.line2 || null,
        city: data.city,
        district: data.district || null,
        postalCode: data.postalCode || null,
        country: "CY",
        isDefault: makeDefault,
      });
    }
  } catch (error) {
    console.error("[saveCustomerAddress]", error);
    return { ok: false, message: t("addressSaveFailed") };
  }

  revalidateAccountPaths();
  return { ok: true, message: t("addressSaved") };
}

export async function deleteCustomerAddress(
  addressId: string,
): Promise<AddressState> {
  const t = await getTranslations("Account");
  const customer = await getCurrentCustomer();
  if (!customer) return { ok: false, message: t("sessionExpired") };

  try {
    const row = await db.query.addresses.findFirst({
      where: and(
        eq(addresses.id, addressId),
        eq(addresses.customerId, customer.id),
      ),
    });
    if (!row) return { ok: false, message: t("addressNotFound") };

    await db.delete(addresses).where(eq(addresses.id, addressId));

    if (row.isDefault) {
      const next = await db.query.addresses.findFirst({
        where: eq(addresses.customerId, customer.id),
      });
      if (next) {
        await db
          .update(addresses)
          .set({ isDefault: true, updatedAt: new Date() })
          .where(eq(addresses.id, next.id));
      }
    }
  } catch (error) {
    console.error("[deleteCustomerAddress]", error);
    return { ok: false, message: t("addressDeleteFailed") };
  }

  revalidateAccountPaths();
  return { ok: true, message: t("addressDeleted") };
}

export async function setDefaultCustomerAddress(
  addressId: string,
): Promise<AddressState> {
  const t = await getTranslations("Account");
  const customer = await getCurrentCustomer();
  if (!customer) return { ok: false, message: t("sessionExpired") };

  try {
    const row = await db.query.addresses.findFirst({
      where: and(
        eq(addresses.id, addressId),
        eq(addresses.customerId, customer.id),
      ),
    });
    if (!row) return { ok: false, message: t("addressNotFound") };

    await db
      .update(addresses)
      .set({ isDefault: false, updatedAt: new Date() })
      .where(eq(addresses.customerId, customer.id));
    await db
      .update(addresses)
      .set({ isDefault: true, updatedAt: new Date() })
      .where(eq(addresses.id, addressId));
  } catch (error) {
    console.error("[setDefaultCustomerAddress]", error);
    return { ok: false, message: t("addressSaveFailed") };
  }

  revalidateAccountPaths();
  return { ok: true, message: t("addressSaved") };
}
