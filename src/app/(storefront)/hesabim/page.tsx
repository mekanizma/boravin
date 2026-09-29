import Link from "next/link";
import { logoutAccount } from "@/features/account/actions";
import { getCurrentCustomer } from "@/lib/account/session";
import { RegisterForm } from "@/components/storefront/register-form";

export const metadata = { title: "Hesabım" };

export default async function AccountPage({
  searchParams,
}: {
  searchParams: Promise<{ order?: string }>;
}) {
  const sp = await searchParams;
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

  return (
    <section className="container-bv py-6 sm:py-12">
      <div className="mx-auto w-full max-w-[32rem] border border-[#e3e8ec] bg-white p-4 sm:p-6">
        <p className="text-[11px] font-semibold tracking-[0.16em] text-[#6b7280] uppercase">
          {corporate ? "Kurumsal hesap" : "Bireysel hesap"}
        </p>
        <h1 className="mt-2 font-display text-3xl font-semibold tracking-tight text-[#111]">
          {name || "Hesabım"}
        </h1>
        {sp.order ? (
          <p className="mt-4 border border-[var(--bv-success)]/30 bg-[#f4fbf6] px-3 py-3 text-sm text-[var(--bv-success)]">
            Siparişiniz alındı: {sp.order}
          </p>
        ) : null}
        <dl className="mt-5 space-y-3 text-sm">
          {corporate && customer.companyTitle ? (
            <div className="flex justify-between gap-3">
              <dt className="text-[#6b7280]">Firma ünvanı</dt>
              <dd className="text-right font-medium text-[#111]">{customer.companyTitle}</dd>
            </div>
          ) : null}
          {corporate && customer.companyName ? (
            <div className="flex justify-between gap-3">
              <dt className="text-[#6b7280]">Firma ismi</dt>
              <dd className="text-right font-medium text-[#111]">{customer.companyName}</dd>
            </div>
          ) : null}
          {corporate && customer.taxOffice ? (
            <div className="flex justify-between gap-3">
              <dt className="text-[#6b7280]">Vergi dairesi</dt>
              <dd className="text-right font-medium text-[#111]">{customer.taxOffice}</dd>
            </div>
          ) : null}
          {corporate && customer.taxNumber ? (
            <div className="flex justify-between gap-3">
              <dt className="text-[#6b7280]">Vergi numarası</dt>
              <dd className="text-right font-medium text-[#111]">{customer.taxNumber}</dd>
            </div>
          ) : null}
          <div className="flex justify-between gap-3">
            <dt className="text-[#6b7280]">E-posta</dt>
            <dd className="text-right font-medium break-all text-[#111]">{customer.email}</dd>
          </div>
          {customer.phone ? (
            <div className="flex justify-between gap-3">
              <dt className="text-[#6b7280]">Telefon</dt>
              <dd className="text-right font-medium text-[#111]">{customer.phone}</dd>
            </div>
          ) : null}
        </dl>
        <div className="mt-6 grid gap-2 sm:grid-cols-2">
          <Link
            href="/favoriler"
            className="inline-flex h-12 items-center justify-center border border-[#d7dee3] text-sm font-semibold text-[#111]"
          >
            Favoriler
          </Link>
          <Link
            href="/urunler"
            className="inline-flex h-12 items-center justify-center bg-[var(--bv-teal)] text-sm font-semibold text-white"
          >
            Alışverişe devam
          </Link>
        </div>
        <form action={logoutAccount} className="mt-3">
          <button
            type="submit"
            className="inline-flex h-12 w-full items-center justify-center text-sm font-semibold text-[#444]"
          >
            Çıkış yap
          </button>
        </form>
      </div>
    </section>
  );
}
