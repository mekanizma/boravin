"use client";

import * as React from "react";
import { useActionState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import {
  deleteCustomerAddress,
  saveCustomerAddress,
  setDefaultCustomerAddress,
  type AddressState,
} from "@/features/account/actions";
import { cn } from "@/lib/utils";

const initialState: AddressState = { ok: false };

export type AddressRow = {
  id: string;
  title: string | null;
  fullName: string;
  phone: string | null;
  line1: string;
  line2: string | null;
  city: string;
  district: string | null;
  postalCode: string | null;
  isDefault: boolean;
};

function Field({
  label,
  name,
  defaultValue,
  required = false,
  autoComplete,
  error,
}: {
  label: string;
  name: string;
  defaultValue?: string;
  required?: boolean;
  autoComplete?: string;
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
        defaultValue={defaultValue}
        required={required}
        autoComplete={autoComplete}
        aria-invalid={Boolean(error)}
        className={cn(
          "mt-1.5 h-12 w-full border border-[#d7dee3] bg-white px-3 text-base text-[#111] outline-none focus:border-[#111]",
          error && "border-[var(--bv-danger)]",
        )}
      />
      {error ? (
        <span className="mt-1 block text-xs text-[var(--bv-danger)]">{error}</span>
      ) : null}
    </label>
  );
}

function AddressForm({
  address,
  onCancel,
  defaults,
}: {
  address?: AddressRow | null;
  onCancel?: () => void;
  defaults?: { fullName?: string; phone?: string };
}) {
  const t = useTranslations("Account");
  const router = useRouter();
  const [state, action, pending] = useActionState(
    async (prev: AddressState, formData: FormData) => {
      const result = await saveCustomerAddress(prev, formData);
      if (result.ok) {
        onCancel?.();
        router.refresh();
      }
      return result;
    },
    initialState,
  );
  const errors = state.fieldErrors ?? {};

  return (
    <form action={action} className="space-y-3 border border-[#e3e8ec] bg-[#fafbfc] p-3 sm:p-4">
      {address ? <input type="hidden" name="id" value={address.id} /> : null}
      {state.message && !state.ok ? (
        <p className="text-sm text-[var(--bv-danger)]" role="alert">
          {state.message}
        </p>
      ) : null}
      <Field
        label={t("addressTitle")}
        name="title"
        defaultValue={address?.title ?? ""}
        error={errors.title}
      />
      <Field
        label={t("fullName")}
        name="fullName"
        defaultValue={address?.fullName ?? defaults?.fullName ?? ""}
        required
        autoComplete="name"
        error={errors.fullName}
      />
      <Field
        label={t("phone")}
        name="phone"
        defaultValue={address?.phone ?? defaults?.phone ?? ""}
        required
        autoComplete="tel"
        error={errors.phone}
      />
      <Field
        label={t("line1")}
        name="line1"
        defaultValue={address?.line1 ?? ""}
        required
        autoComplete="street-address"
        error={errors.line1}
      />
      <div className="grid gap-3 sm:grid-cols-2">
        <Field
          label={t("city")}
          name="city"
          defaultValue={address?.city ?? ""}
          required
          autoComplete="address-level1"
          error={errors.city}
        />
        <Field
          label={t("district")}
          name="district"
          defaultValue={address?.district ?? ""}
          autoComplete="address-level2"
          error={errors.district}
        />
      </div>
      <Field
        label={t("postalCode")}
        name="postalCode"
        defaultValue={address?.postalCode ?? ""}
        autoComplete="postal-code"
        error={errors.postalCode}
      />
      <label className="flex items-center gap-2 text-sm text-[#333]">
        <input
          type="checkbox"
          name="isDefault"
          defaultChecked={address?.isDefault ?? true}
          className="accent-[var(--bv-teal)]"
        />
        {t("setAsDefault")}
      </label>
      <div className="flex flex-col gap-2 sm:flex-row">
        <button
          type="submit"
          disabled={pending}
          className="inline-flex h-11 flex-1 items-center justify-center bg-[var(--bv-teal)] text-sm font-semibold text-white disabled:opacity-55"
        >
          {pending ? t("saving") : address ? t("updateAddress") : t("addAddress")}
        </button>
        {onCancel ? (
          <button
            type="button"
            onClick={onCancel}
            className="inline-flex h-11 items-center justify-center px-4 text-sm font-semibold text-[#444]"
          >
            {t("cancel")}
          </button>
        ) : null}
      </div>
    </form>
  );
}

export function AddressManager({
  addresses,
  defaults,
}: {
  addresses: AddressRow[];
  defaults?: { fullName?: string; phone?: string };
}) {
  const t = useTranslations("Account");
  const router = useRouter();
  const [editingId, setEditingId] = React.useState<string | null>(null);
  const [adding, setAdding] = React.useState(addresses.length === 0);
  const [busyId, setBusyId] = React.useState<string | null>(null);

  async function onDelete(id: string) {
    if (!window.confirm(t("confirmDeleteAddress"))) return;
    setBusyId(id);
    await deleteCustomerAddress(id);
    setBusyId(null);
    router.refresh();
  }

  async function onDefault(id: string) {
    setBusyId(id);
    await setDefaultCustomerAddress(id);
    setBusyId(null);
    router.refresh();
  }

  return (
    <div className="space-y-3">
      {addresses.length === 0 && !adding ? (
        <p className="text-sm text-[#6b7280]">{t("noAddresses")}</p>
      ) : null}

      <ul className="space-y-3">
        {addresses.map((address) => (
          <li key={address.id} className="border border-[#e3e8ec] bg-white p-3 sm:p-4">
            {editingId === address.id ? (
              <AddressForm
                address={address}
                onCancel={() => setEditingId(null)}
              />
            ) : (
              <>
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-[#111]">
                      {address.title || t("addressFallbackTitle")}
                      {address.isDefault ? (
                        <span className="ml-2 text-[11px] font-semibold tracking-wide text-[var(--bv-teal)] uppercase">
                          {t("defaultBadge")}
                        </span>
                      ) : null}
                    </p>
                    <p className="mt-1 text-sm text-[#333]">{address.fullName}</p>
                    {address.phone ? (
                      <p className="text-sm text-[#555]">{address.phone}</p>
                    ) : null}
                    <p className="mt-1 text-sm text-[#555]">
                      {address.line1}
                      {address.line2 ? `, ${address.line2}` : ""}
                    </p>
                    <p className="text-sm text-[#555]">
                      {[address.district, address.city, address.postalCode]
                        .filter(Boolean)
                        .join(", ")}
                    </p>
                  </div>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setAdding(false);
                      setEditingId(address.id);
                    }}
                    className="h-10 px-3 text-sm font-semibold text-[#111] underline-offset-2 hover:underline"
                  >
                    {t("edit")}
                  </button>
                  {!address.isDefault ? (
                    <button
                      type="button"
                      disabled={busyId === address.id}
                      onClick={() => onDefault(address.id)}
                      className="h-10 px-3 text-sm font-semibold text-[#111] underline-offset-2 hover:underline disabled:opacity-55"
                    >
                      {t("makeDefault")}
                    </button>
                  ) : null}
                  <button
                    type="button"
                    disabled={busyId === address.id}
                    onClick={() => onDelete(address.id)}
                    className="h-10 px-3 text-sm font-semibold text-[var(--bv-danger)] underline-offset-2 hover:underline disabled:opacity-55"
                  >
                    {t("delete")}
                  </button>
                </div>
              </>
            )}
          </li>
        ))}
      </ul>

      {adding ? (
        <AddressForm
          defaults={defaults}
          onCancel={addresses.length > 0 ? () => setAdding(false) : undefined}
        />
      ) : (
        <button
          type="button"
          onClick={() => {
            setEditingId(null);
            setAdding(true);
          }}
          className="inline-flex h-11 w-full items-center justify-center border border-[#d7dee3] text-sm font-semibold text-[#111] sm:w-auto sm:px-5"
        >
          {t("addAddress")}
        </button>
      )}
    </div>
  );
}
