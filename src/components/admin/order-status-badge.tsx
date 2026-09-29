import {
  ORDER_STATUS_LABELS,
  ORDER_STATUS_TONES,
  isOrderStatus,
  orderStatusLabel,
  paymentStatusLabel,
} from "@/lib/orders/status";
import { Badge } from "@/components/ui/badge";

export function OrderStatusBadge({ status }: { status: string }) {
  const tone = isOrderStatus(status) ? ORDER_STATUS_TONES[status] : "neutral";
  return <Badge tone={tone}>{orderStatusLabel(status)}</Badge>;
}

export function PaymentStatusBadge({ status }: { status: string }) {
  const tone =
    status === "paid"
      ? ("success" as const)
      : status === "failed" || status === "refunded"
        ? ("danger" as const)
        : ("warning" as const);
  return <Badge tone={tone}>{paymentStatusLabel(status)}</Badge>;
}

export { ORDER_STATUS_LABELS };
