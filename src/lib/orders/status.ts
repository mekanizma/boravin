export const ORDER_STATUSES = [
  "new",
  "awaiting_payment",
  "accepted",
  "preparing",
  "shipped",
  "delivered",
  "cancelled",
  "returned",
] as const;

export type OrderStatus = (typeof ORDER_STATUSES)[number];

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  new: "Yeni sipariş",
  awaiting_payment: "Ödeme bekliyor",
  accepted: "Sipariş kabul edildi",
  preparing: "Hazırlanıyor",
  shipped: "Gönderildi",
  delivered: "Teslim edildi",
  cancelled: "İptal edildi",
  returned: "İade",
};

export const PAYMENT_STATUS_LABELS: Record<string, string> = {
  pending: "Bekliyor",
  paid: "Ödendi",
  failed: "Başarısız",
  refunded: "İade edildi",
};

export const ORDER_STATUS_TONES: Record<
  OrderStatus,
  "neutral" | "accent" | "success" | "warning" | "danger" | "info"
> = {
  new: "info",
  awaiting_payment: "warning",
  accepted: "accent",
  preparing: "warning",
  shipped: "info",
  delivered: "success",
  cancelled: "danger",
  returned: "neutral",
};

/** Primary happy-path flow shown in the UI */
export const ORDER_FLOW: OrderStatus[] = [
  "new",
  "accepted",
  "preparing",
  "shipped",
  "delivered",
];

const TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  new: ["accepted", "preparing", "cancelled"],
  awaiting_payment: ["accepted", "preparing", "cancelled"],
  accepted: ["preparing", "cancelled"],
  preparing: ["shipped", "cancelled"],
  shipped: ["delivered", "returned"],
  delivered: ["returned"],
  cancelled: [],
  returned: [],
};

export function isOrderStatus(value: string): value is OrderStatus {
  return (ORDER_STATUSES as readonly string[]).includes(value);
}

export function orderStatusLabel(status: string) {
  if (isOrderStatus(status)) return ORDER_STATUS_LABELS[status];
  return status;
}

export function paymentStatusLabel(status: string) {
  return PAYMENT_STATUS_LABELS[status] ?? status;
}

export function allowedNextStatuses(current: string): OrderStatus[] {
  if (!isOrderStatus(current)) return [];
  return TRANSITIONS[current];
}

export function canTransition(from: string, to: string) {
  return allowedNextStatuses(from).includes(to as OrderStatus);
}
