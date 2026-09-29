import { formatCurrency } from "@/lib/utils";

const RATES: Record<string, number> = {
  TRY: 1,
  USD: 0.0204,
  EUR: 0.0179,
  GBP: 0.0155,
};

export function convertAmount(
  amount: number,
  from: string,
  to: string,
): number {
  const fromRate = RATES[from] ?? 1;
  const toRate = RATES[to] ?? 1;
  const inTry = amount / fromRate;
  return Number((inTry * toRate).toFixed(2));
}

export function formatMoney(
  amount: number,
  currency = process.env.NEXT_PUBLIC_DEFAULT_CURRENCY ?? "TRY",
  locale = "tr-TR",
) {
  return formatCurrency(amount, currency, locale);
}

export function supportedCurrencies() {
  return Object.keys(RATES);
}
