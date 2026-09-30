import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { logoutAccount } from "@/features/account/actions";
import { getCurrentCustomer } from "@/lib/account/session";
import { RegisterForm } from "@/components/storefront/register-form";
import { ProfileEditForm } from "@/components/storefront/profile-edit-form";
import { AddressManager } from "@/components/storefront/address-manager";
import { db } from "@/lib/db";
import { addresses } from "@/lib/db/schema";
import { desc, eq } from "drizzle-orm";

export async function generateMetadata() {
  const t = await getTranslations("Account");
  return { title: t("metadataTitle") };
}

export default async function AccountPage() {
  const t = await getTranslations("Account");
  const tOrders = await getTranslations("Orders");
  const customer = await getCurrentCustomer();

  if (!customer) {
    return (
      <section className="container-bv py-6 sm:py-12">
        <div className="mx-auto w-full max-w-[32rem]">
          <RegisterForm initialMode="login" />
        </div>
      </section>
    );
  }

  const name = [customer.firstName, customer.lastName].filter(Boolean).join(" ");
  const corporate = customer.accountType === "corporate";
  let customerAddresses: Awaited<
    ReturnType<typeof db.query.addresses.findMany>
  > = [];
  try {
    customerAddresses = await db.query.addresses.findMany({
      where: eq(addresses.customerId, customer.id),
      orderBy: [desc(addresses.isDefault), desc(addresses.updatedAt)],
    });
  } catch {
    customerAddresses = [];
  }

  return (
    <section className="container-bv py-6 sm:py-12">
      <div className="mx-auto flex w-full max-w-[40rem] flex-col gap-4 sm:gap-5">
        <div className="border border-[#e3e8ec] bg-white p-4 sm:p-6">
          <p className="text-[11px] font-semibold tracking-[0.16em] text-[#6b7280] uppercase">
            {corporate ? t("corporateAccount") : t("individualAccount")}
          </p>
          <h1 className="mt-2 font-display text-3xl font-semibold tracking-tight text-[#111]">
            {name || t("fallbackTitle")}
          </h1>
          <p className="mt-3 text-sm text-[#6b7280]">{customer.email}</p>
          <div className="mt-5 grid gap-2 sm:grid-cols-2">
            <Link
              href="/siparis-takip"
              className="inline-flex h-12 items-center justify-center border border-[#d7dee3] text-sm font-semibold text-[#111]"
            >
              {tOrders("trackOrders")}
            </Link>
            <Link
              href="/favoriler"
              className="inline-flex h-12 items-center justify-center border border-[#d7dee3] text-sm font-semibold text-[#111]"
            >
              {t("favorites")}
            </Link>
            <Link
              href="/urunler"
              className="inline-flex h-12 items-center justify-center bg-[var(--bv-teal)] text-sm font-semibold text-white sm:col-span-2"
            >
              {t("continueShopping")}
            </Link>
          </div>
          <form action={logoutAccount} className="mt-3">
            <button
              type="submit"
              className="inline-flex h-12 w-full items-center justify-center text-sm font-semibold text-[#444]"
            >
              {t("logout")}
            </button>
          </form>
        </div>

        <div className="border border-[#e3e8ec] bg-white p-4 sm:p-6">
          <h2 className="font-display text-xl font-semibold tracking-tight text-[#111]">
            {t("profileSection")}
          </h2>
          <p className="mt-1 text-sm text-[#6b7280]">{t("profileSectionHint")}</p>
          <div className="mt-4">
            <ProfileEditForm customer={customer} />
          </div>
        </div>

        <div className="border border-[#e3e8ec] bg-white p-4 sm:p-6">
          <h2 className="font-display text-xl font-semibold tracking-tight text-[#111]">
            {t("addressesSection")}
          </h2>
          <p className="mt-1 text-sm text-[#6b7280]">{t("addressesSectionHint")}</p>
          <div className="mt-4">
            <AddressManager
              addresses={customerAddresses}
              defaults={{
                fullName: name || undefined,
                phone: customer.phone ?? undefined,
              }}
            />
          </div>
        </div>
      </div>
    </section>
  );
}
