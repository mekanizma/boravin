import { randomUUID } from "node:crypto";
import type {
  PaymentChargeInput,
  PaymentChargeResult,
  PaymentProvider,
} from "@/lib/payments/types";

export class MockPaymentProvider implements PaymentProvider {
  readonly name = "mock";

  async charge(input: PaymentChargeInput): Promise<PaymentChargeResult> {
    if (input.amount <= 0) {
      return {
        success: false,
        message: "Amount must be greater than zero",
      };
    }

    return {
      success: true,
      transactionId: `mock_txn_${randomUUID()}`,
      message: `Charged ${input.amount} ${input.currency} for order ${input.orderId}`,
    };
  }

  async refund(
    transactionId: string,
    amount?: number,
  ): Promise<PaymentChargeResult> {
    return {
      success: true,
      transactionId: `mock_ref_${randomUUID()}`,
      message: `Refunded ${amount ?? "full"} for ${transactionId}`,
    };
  }
}

export const mockPaymentProvider = new MockPaymentProvider();
