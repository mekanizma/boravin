import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { RegisterForm } from "@/components/storefront/register-form";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Auth");
  return {
    title: t("metadataTitle"),
    description: t("metadataDescription"),
  };
}

export default function RegisterPage() {
  return (
    <section className="container-bv py-6 sm:py-12">
      <div className="mx-auto w-full max-w-[32rem]">
        <RegisterForm />
      </div>
    </section>
  );
}
