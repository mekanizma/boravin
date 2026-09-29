"use client";

import * as React from "react";
import { useActionState } from "react";
import { loginAccount, registerAccount, type RegisterState } from "@/features/account/actions";
import { cn } from "@/lib/utils";

const initialState: RegisterState = { ok: false };

type AccountType = "individual" | "corporate";
type Mode = "login" | "register";

function Field({
  label,
  name,
  type = "text",
  required = false,
  autoComplete,
  inputMode,
  error,
}: {
  label: string;
  name: string;
  type?: string;
  required?: boolean;
  autoComplete?: string;
  inputMode?: React.HTMLAttributes<HTMLInputElement>["inputMode"];
  error?: string;
}) {
  return (
    <label className="block">
      <span className="text-[13px] font-medium text-[#222]">
        {label}
        {required ? <span className="text-[var(--bv-teal)]"> *</span> : null}
      </span>
      <input
        name={name}
        type={type}
        required={required}
        autoComplete={autoComplete}
        inputMode={inputMode}
        aria-invalid={Boolean(error)}
        className={cn(
          "mt-1.5 h-12 w-full border border-[#d7dee3] bg-white px-3 text-base text-[#111] outline-none placeholder:text-[#9aa3ab] focus:border-[#111]",
          error && "border-[var(--bv-danger)]",
        )}
      />
      {error ? <span className="mt-1 block text-xs text-[var(--bv-danger)]">{error}</span> : null}
    </label>
  );
}

function Choice({
  value,
  current,
  onChange,
  options,
}: {
  value: string;
  current: string;
  onChange: (value: string) => void;
  options: readonly (readonly [string, string])[];
}) {
  return (
    <div className="grid grid-cols-2 border border-[#d7dee3] bg-white p-1">
      {options.map(([option, label]) => (
        <button
          key={option}
          type="button"
          aria-pressed={current === option}
          onClick={() => onChange(option)}
          className={cn(
            "h-11 text-sm font-semibold",
            value === option ? "bg-[#111] text-white" : "text-[#444]",
          )}
        >
          {label}
        </button>
      ))}
    </div>
  );
}

function LoginForm({ accountType }: { accountType: AccountType }) {
  const [state, action, pending] = useActionState(loginAccount, initialState);
  const errors = state.fieldErrors ?? {};

  return (
    <form action={action} className="mt-4 border border-[#e3e8ec] bg-white p-4 sm:p-6">
      <input type="hidden" name="accountType" value={accountType} />
      {state.message ? (
        <p className="mb-4 text-sm text-[var(--bv-danger)]" role="alert">
          {state.message}
        </p>
      ) : null}
      <div className="space-y-3">
        <Field
          label="E-posta"
          name="email"
          type="email"
          required
          autoComplete="email"
          error={errors.email}
        />
        <Field
          label="Şifre"
          name="password"
          type="password"
          required
          autoComplete="current-password"
          error={errors.password}
        />
      </div>
      <button
        type="submit"
        disabled={pending}
        className="mt-5 h-12 w-full bg-[var(--bv-teal)] text-sm font-semibold text-white disabled:opacity-60"
      >
        {pending ? "Giriş yapılıyor…" : "Giriş yap"}
      </button>
    </form>
  );
}

function SignupForm({ accountType }: { accountType: AccountType }) {
  const [state, action, pending] = useActionState(registerAccount, initialState);
  const errors = state.fieldErrors ?? {};

  return (
    <form action={action} className="mt-4 border border-[#e3e8ec] bg-white p-4 sm:p-6">
      <input type="hidden" name="accountType" value={accountType} />
      {state.message ? (
        <p className="mb-4 text-sm text-[var(--bv-danger)]" role="alert">
          {state.message}
        </p>
      ) : null}

      {accountType === "corporate" ? (
        <div className="mb-4 space-y-3 border-b border-[#eee] pb-4">
          <Field label="Firma ismi" name="companyName" autoComplete="organization" error={errors.companyName} />
          <Field
            label="Firma ünvanı"
            name="companyTitle"
            required
            autoComplete="organization"
            error={errors.companyTitle}
          />
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Vergi dairesi" name="taxOffice" required error={errors.taxOffice} />
            <Field
              label="Vergi numarası"
              name="taxNumber"
              required
              inputMode="numeric"
              error={errors.taxNumber}
            />
          </div>
        </div>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="İsim" name="firstName" required autoComplete="given-name" error={errors.firstName} />
        <Field label="Soyisim" name="lastName" required autoComplete="family-name" error={errors.lastName} />
      </div>
      <div className="mt-3 space-y-3">
        {accountType === "individual" ? (
          <Field
            label="Telefon"
            name="phone"
            type="tel"
            required
            autoComplete="tel"
            inputMode="tel"
            error={errors.phone}
          />
        ) : null}
        <Field label="E-posta" name="email" type="email" required autoComplete="email" error={errors.email} />
        {accountType === "corporate" ? (
          <Field
            label="Telefon"
            name="phone"
            type="tel"
            required
            autoComplete="tel"
            inputMode="tel"
            error={errors.phone}
          />
        ) : null}
        <Field
          label="Şifre"
          name="password"
          type="password"
          required
          autoComplete="new-password"
          error={errors.password}
        />
        <Field
          label="Şifre tekrarı"
          name="passwordConfirm"
          type="password"
          required
          autoComplete="new-password"
          error={errors.passwordConfirm}
        />
      </div>
      <button
        type="submit"
        disabled={pending}
        className="mt-5 h-12 w-full bg-[var(--bv-teal)] text-sm font-semibold text-white disabled:opacity-60"
      >
        {pending ? "Kaydediliyor…" : "Hesap oluştur"}
      </button>
    </form>
  );
}

export function RegisterForm({ initialMode = "register" }: { initialMode?: Mode }) {
  const [mode, setMode] = React.useState<Mode>(initialMode);
  const [accountType, setAccountType] = React.useState<AccountType>("individual");

  return (
    <div>
      <p className="text-[11px] font-semibold tracking-[0.16em] text-[#6b7280] uppercase">Hesap</p>
      <h1 className="mt-2 font-display text-3xl font-semibold tracking-tight text-[#111]">
        {mode === "login" ? "Giriş yap" : "Üye ol"}
      </h1>
      <p className="mt-2 text-sm text-[#555]">
        {mode === "login"
          ? "Bireysel veya kurumsal hesabınızla giriş yapın."
          : "Bireysel veya kurumsal hesap oluşturun."}
      </p>

      <div className="mt-5 space-y-2">
        <Choice
          value={mode}
          current={mode}
          onChange={(value) => setMode(value as Mode)}
          options={[
            ["login", "Giriş yap"],
            ["register", "Üye ol"],
          ]}
        />
        <Choice
          value={accountType}
          current={accountType}
          onChange={(value) => setAccountType(value as AccountType)}
          options={[
            ["individual", "Bireysel"],
            ["corporate", "Kurumsal"],
          ]}
        />
      </div>

      {mode === "login" ? (
        <LoginForm key={accountType} accountType={accountType} />
      ) : (
        <SignupForm key={accountType} accountType={accountType} />
      )}
    </div>
  );
}
