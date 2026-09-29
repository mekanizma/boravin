"use client";

import * as React from "react";
import { useActionState } from "react";
import { useTranslations } from "next-intl";
import {
  updateCustomerProfile,
  type ProfileState,
} from "@/features/account/actions";
import { cn } from "@/lib/utils";

const initialState: ProfileState = { ok: false };

type CustomerProfile = {
  email: string;
  firstName: string | null;
  lastName: string | null;
  phone: string | null;
  accountType: string;
  companyName: string | null;
  companyTitle: string | null;
  taxOffice: string | null;
  taxNumber: string | null;
};

function Field({
  label,
  name,
  defaultValue,
  type = "text",
  required = false,
  autoComplete,
  error,
  readOnly = false,
}: {
  label: string;
  name: string;
  defaultValue?: string;
  type?: string;
  required?: boolean;
  autoComplete?: string;
  error?: string;
  readOnly?: boolean;
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
        defaultValue={defaultValue}
        required={required}
        autoComplete={autoComplete}
        readOnly={readOnly}
        aria-invalid={Boolean(error)}
        className={cn(
          "mt-1.5 h-12 w-full border border-[#d7dee3] bg-white px-3 text-base text-[#111] outline-none placeholder:text-[#9aa3ab] focus:border-[#111]",
          readOnly && "bg-[#f6f8fa] text-[#555]",
          error && "border-[var(--bv-danger)]",
        )}
      />
      {error ? (
        <span className="mt-1 block text-xs text-[var(--bv-danger)]">{error}</span>
      ) : null}
    </label>
  );
}

export function ProfileEditForm({ customer }: { customer: CustomerProfile }) {
  const t = useTranslations("Account");
  const [state, action, pending] = useActionState(
    updateCustomerProfile,
    initialState,
  );
  const errors = state.fieldErrors ?? {};
  const corporate = customer.accountType === "corporate";

  return (
    <form action={action} className="space-y-3">
      {state.message ? (
        <p
          className={cn(
            "text-sm",
            state.ok ? "text-[var(--bv-success)]" : "text-[var(--bv-danger)]",
          )}
          role="status"
        >
          {state.message}
        </p>
      ) : null}
      <Field
        label={t("email")}
        name="email"
        type="email"
        defaultValue={customer.email}
        readOnly
      />
      <div className="grid gap-3 sm:grid-cols-2">
        <Field
          label={t("firstName")}
          name="firstName"
          defaultValue={customer.firstName ?? ""}
          required
          autoComplete="given-name"
          error={errors.firstName}
        />
        <Field
          label={t("lastName")}
          name="lastName"
          defaultValue={customer.lastName ?? ""}
          required
          autoComplete="family-name"
          error={errors.lastName}
        />
      </div>
      <Field
        label={t("phone")}
        name="phone"
        type="tel"
        defaultValue={customer.phone ?? ""}
        required
        autoComplete="tel"
        error={errors.phone}
      />
      {corporate ? (
        <>
          <Field
            label={t("companyTitle")}
            name="companyTitle"
            defaultValue={customer.companyTitle ?? ""}
            required
            error={errors.companyTitle}
          />
          <Field
            label={t("companyName")}
            name="companyName"
            defaultValue={customer.companyName ?? ""}
            error={errors.companyName}
          />
          <div className="grid gap-3 sm:grid-cols-2">
            <Field
              label={t("taxOffice")}
              name="taxOffice"
              defaultValue={customer.taxOffice ?? ""}
              required
              error={errors.taxOffice}
            />
            <Field
              label={t("taxNumber")}
              name="taxNumber"
              defaultValue={customer.taxNumber ?? ""}
              required
              error={errors.taxNumber}
            />
          </div>
        </>
      ) : null}
      <button
        type="submit"
        disabled={pending}
        className="inline-flex h-12 w-full items-center justify-center bg-[var(--bv-teal)] text-sm font-semibold text-white disabled:opacity-55 sm:w-auto sm:px-8"
      >
        {pending ? t("saving") : t("saveProfile")}
      </button>
    </form>
  );
}
