import type { PaymentProvider } from "@/lib/payments/types";
import { mockPaymentProvider } from "@/lib/payments/providers/mock";

export type {
  PaymentChargeInput,
  PaymentChargeResult,
  PaymentProvider,
} from "@/lib/payments/types";

export function getPaymentProvider(name?: string): PaymentProvider {
  const provider = (
    name ??
    process.env.PAYMENT_PROVIDER ??
    "mock"
  ).toLowerCase();

  switch (provider) {
    case "mock":
      return mockPaymentProvider;
    default:
      throw new Error(
        `Unknown PAYMENT_PROVIDER "${provider}". Supported: mock`,
      );
  }
}
