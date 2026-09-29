import type { ShippingProvider } from "@/lib/shipping/types";
import { mockShippingProvider } from "@/lib/shipping/providers/mock";

export type * from "@/lib/shipping/types";

export function getShippingProvider(name?: string): ShippingProvider {
  const provider = (
    name ??
    process.env.SHIPPING_PROVIDER ??
    "mock"
  ).toLowerCase();

  switch (provider) {
    case "mock":
      return mockShippingProvider;
    default:
      throw new Error(
        `Unknown SHIPPING_PROVIDER "${provider}". Supported: mock`,
      );
  }
}
