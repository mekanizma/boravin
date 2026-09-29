import { getLocale } from "next-intl/server";
import { useLocale } from "next-intl";
import { formatCurrency as formatCurrencyBase } from "@/lib/utils";
import { toBcp47, type AppLocale } from "@/i18n/config";

export function formatMoney(
  amount: number | string,
  locale: AppLocale,
  currency = "TRY",
) {
  return formatCurrencyBase(amount, currency, toBcp47(locale));
}

export function useFormatMoney(currency = "TRY") {
  const locale = useLocale() as AppLocale;
  return (amount: number | string) => formatMoney(amount, locale, currency);
}

export async function formatMoneyServer(
  amount: number | string,
  currency = "TRY",
) {
  const locale = (await getLocale()) as AppLocale;
  return formatMoney(amount, locale, currency);
}

export function formatDateLocale(
  value: Date | string | number,
  locale: AppLocale,
  options?: Intl.DateTimeFormatOptions,
) {
  const date = value instanceof Date ? value : new Date(value);
  return date.toLocaleDateString(toBcp47(locale), options);
}
