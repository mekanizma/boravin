import type { Metadata } from "next";
import { RegisterForm } from "@/components/storefront/register-form";

export const metadata: Metadata = {
  title: "Üye ol",
  description: "Boravin bireysel ve kurumsal giriş ve üyelik.",
};

export default function RegisterPage() {
  return (
    <section className="container-bv py-6 sm:py-12">
      <div className="mx-auto w-full max-w-[32rem]">
        <RegisterForm />
      </div>
    </section>
  );
}
