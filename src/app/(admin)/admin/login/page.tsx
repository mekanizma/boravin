"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useActionState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { BrandLogo } from "@/components/brand-logo";
import {
  loginAdmin,
  type AdminLoginState,
} from "@/features/auth/actions";

const initial: AdminLoginState = { ok: false };

export default function AdminLoginPage() {
  const router = useRouter();
  const [state, action, pending] = useActionState(loginAdmin, initial);

  React.useEffect(() => {
    if (state.ok) {
      router.push("/admin");
      router.refresh();
    }
  }, [state.ok, router]);

  return (
    <div className="flex min-h-dvh items-center justify-center bg-[var(--bv-ink)] px-4 py-10">
      <div className="w-full max-w-md bg-[var(--bv-paper)] p-6 sm:p-8">
        <BrandLogo href={null} size="lg" priority />
        <h1 className="mt-3 text-sm text-[var(--bv-muted)]">Admin girişi</h1>
        <form action={action} className="mt-8 space-y-4">
          <Input
            label="E-posta"
            name="email"
            type="email"
            autoComplete="username"
            required
          />
          <Input
            label="Şifre"
            name="password"
            type="password"
            autoComplete="current-password"
            required
          />
          {state.message && !state.ok ? (
            <p className="text-sm text-[var(--bv-danger)]" role="alert">
              {state.message}
            </p>
          ) : null}
          <Button
            type="submit"
            variant="accent"
            className="w-full"
            disabled={pending}
          >
            {pending ? "Giriş yapılıyor…" : "Giriş yap"}
          </Button>
        </form>
      </div>
    </div>
  );
}
