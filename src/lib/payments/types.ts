export type PaymentChargeInput = {
  amount: number;
  currency: string;
  orderId: string;
  description?: string;
};

export type PaymentChargeResult = {
  success: boolean;
  transactionId?: string;
  message?: string;
};

export interface PaymentProvider {
  name: string;
  charge(input: PaymentChargeInput): Promise<PaymentChargeResult>;
  refund?(transactionId: string, amount?: number): Promise<PaymentChargeResult>;
}
