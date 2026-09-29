"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useActionState } from "react";
import { ArrowLeft, Eye, EyeOff, Lock, ShieldCheck } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  loginAdmin,
  type AdminLoginState,
} from "@/features/auth/actions";

const initial: AdminLoginState = { ok: false };

export default function AdminLoginPage() {
  const router = useRouter();
  const [state, action, pending] = useActionState(loginAdmin, initial);
  const [showPassword, setShowPassword] = React.useState(false);

  React.useEffect(() => {
    if (state.ok) {
      router.push("/admin");
      router.refresh();
    }
  }, [state.ok, router]);

  return (
    <div className="bv-admin-login relative flex min-h-dvh bg-[var(--bv-ink)] text-[var(--bv-ink)]">
      {/* Brand stage */}
      <aside className="relative hidden w-[46%] shrink-0 overflow-hidden lg:flex lg:flex-col lg:justify-between lg:p-12 xl:p-14">
        <div
          className="pointer-events-none absolute inset-0"
          aria-hidden
        >
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_20%_10%,rgba(227,0,15,0.22),transparent_55%),radial-gradient(ellipse_at_80%_90%,rgba(255,255,255,0.06),transparent_50%)]" />
          <div className="bv-admin-login-grid absolute inset-0 opacity-[0.35]" />
          <div className="absolute inset-y-0 right-0 w-px bg-gradient-to-b from-transparent via-white/20 to-transparent" />
          <div className="absolute left-12 top-0 h-full w-px bg-[var(--bv-teal)]/40 xl:left-14" />
        </div>

        <div className="relative bv-admin-login-enter">
          <p className="font-display text-[1.5rem] font-bold tracking-[0.22em] text-white uppercase">
            Borav<span className="text-[var(--bv-teal)]">İ</span>n
          </p>
          <span
            className="mt-3 block h-0.5 w-14 bg-[var(--bv-teal)]"
            aria-hidden
          />
          <p className="mt-6 max-w-[16rem] text-[11px] font-semibold tracking-[0.22em] text-white/55 uppercase">
            Yönetim paneli
          </p>
        </div>

        <div className="relative bv-admin-login-enter bv-admin-login-enter-delay max-w-md">
          <p className="font-display text-[clamp(2.1rem,3.4vw,3.25rem)] font-semibold leading-[1.05] tracking-tight text-white">
            Operasyon,
            <br />
            stok ve satış
            <span className="text-[var(--bv-teal)]">.</span>
          </p>
          <p className="mt-5 max-w-sm text-[15px] leading-relaxed text-white/60">
            Boravin mağaza sistemine yetkili erişim. Sipariş, envanter ve katalog
            yönetimi tek panelde.
          </p>
          <ul className="mt-8 space-y-3 text-sm text-white/50">
            <li className="flex items-center gap-2.5">
              <ShieldCheck className="h-4 w-4 text-[var(--bv-teal)]" strokeWidth={1.75} />
              Oturum çerezleri güvenli kanal üzerinden
            </li>
            <li className="flex items-center gap-2.5">
              <Lock className="h-4 w-4 text-[var(--bv-teal)]" strokeWidth={1.75} />
              Yalnızca personel hesapları kabul edilir
            </li>
          </ul>
        </div>

        <p className="relative text-xs text-white/35">
          © {new Date().getFullYear()} Boravin Bilişim Ltd.
        </p>
      </aside>

      {/* Form stage */}
      <main className="relative flex flex-1 flex-col bg-[var(--bv-paper)]">
        <div className="flex items-center justify-between border-b border-[var(--bv-border)] px-5 py-4 sm:px-8 lg:px-10">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-sm font-medium text-[var(--bv-slate)] transition-colors hover:text-[var(--bv-ink)]"
          >
            <ArrowLeft className="h-4 w-4" strokeWidth={1.75} />
            Mağazaya dön
          </Link>
          <span className="hidden text-[11px] font-semibold tracking-[0.16em] text-[var(--bv-muted)] uppercase sm:inline">
            Güvenli giriş
          </span>
        </div>

        <div className="flex flex-1 items-center justify-center px-5 py-10 sm:px-8 sm:py-14">
          <div className="bv-admin-login-enter w-full max-w-[24rem]">
            <div>
              <p className="text-[11px] font-semibold tracking-[0.2em] text-[var(--bv-teal)] uppercase">
                Personel
              </p>
              <h1 className="mt-2 font-display text-[1.85rem] font-semibold tracking-tight text-[var(--bv-ink)] sm:text-[2.1rem]">
                Panele giriş
              </h1>
              <p className="mt-2 text-sm leading-relaxed text-[var(--bv-muted)]">
                Yönetim e-posta ve şifrenizle oturum açın.
              </p>
            </div>

            <form action={action} className="mt-8 space-y-5">
              <Input
                label="E-posta"
                name="email"
                type="email"
                autoComplete="username"
                required
                placeholder="ornek@boravin.com"
                className="h-12"
              />

              <div className="flex w-full flex-col gap-1.5">
                <label
                  htmlFor="password"
                  className="text-sm font-medium text-[var(--bv-ink)]"
                >
                  Şifre
                </label>
                <div className="relative">
                  <input
                    id="password"
                    name="password"
                    type={showPassword ? "text" : "password"}
                    autoComplete="current-password"
                    required
                    placeholder="••••••••"
                    className="h-12 w-full border border-[var(--bv-border-strong)] bg-white px-3 pr-12 text-sm text-[var(--bv-ink)] placeholder:text-[var(--bv-muted)] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] disabled:cursor-not-allowed disabled:opacity-50"
                  />
                  <button
                    type="button"
                    className="absolute top-1/2 right-1.5 inline-flex h-9 w-9 -translate-y-1/2 items-center justify-center text-[var(--bv-muted)] transition-colors hover:text-[var(--bv-ink)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]"
                    onClick={() => setShowPassword((v) => !v)}
                    aria-label={showPassword ? "Şifreyi gizle" : "Şifreyi göster"}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" strokeWidth={1.75} />
                    ) : (
                      <Eye className="h-4 w-4" strokeWidth={1.75} />
                    )}
                  </button>
                </div>
              </div>

              {state.message && !state.ok ? (
                <div
                  className="border border-[var(--bv-danger)]/25 bg-[#fff5f5] px-3.5 py-3 text-sm text-[var(--bv-danger)]"
                  role="alert"
                >
                  {state.message}
                </div>
              ) : null}

              <Button
                type="submit"
                variant="accent"
                size="lg"
                className="h-12 w-full"
                disabled={pending}
              >
                {pending ? "Giriş yapılıyor…" : "Giriş yap"}
              </Button>
            </form>

            <p className="mt-8 text-center text-xs leading-relaxed text-[var(--bv-muted)]">
              Bu alan yalnızca yetkili personel içindir. Erişim sorununda mağaza
              yöneticinize başvurun.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
