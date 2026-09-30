import { Check } from "lucide-react";
import { ORDER_FLOW, type OrderStatus, isOrderStatus } from "@/lib/orders/status";

const FLOW_WITH_PAYMENT: OrderStatus[] = [
  "awaiting_payment",
  "accepted",
  "preparing",
  "shipped",
  "delivered",
];

function stepsForStatus(status: string): OrderStatus[] {
  if (status === "awaiting_payment" || status === "new") return FLOW_WITH_PAYMENT;
  if (status === "cancelled" || status === "returned") return ORDER_FLOW;
  return ORDER_FLOW;
}

function activeIndex(status: string, steps: OrderStatus[]) {
  if (!isOrderStatus(status)) return 0;
  if (status === "new") return 0;
  if (status === "awaiting_payment") return 0;
  if (status === "accepted") return Math.max(0, steps.indexOf("accepted"));
  if (status === "preparing") return Math.max(0, steps.indexOf("preparing"));
  if (status === "shipped") return Math.max(0, steps.indexOf("shipped"));
  if (status === "delivered") return steps.length - 1;
  return 0;
}

export function OrderStatusSteps({
  status,
  labels,
}: {
  status: string;
  labels: Record<string, string>;
}) {
  if (status === "cancelled" || status === "returned") {
    return (
      <p className="rounded-lg border border-[#f3d2d2] bg-[#fff7f7] px-3 py-2 text-sm font-medium text-[#b42318]">
        {labels[status] ?? status}
      </p>
    );
  }

  const steps = stepsForStatus(status);
  const current = activeIndex(status, steps);

  return (
    <ol className="grid grid-cols-2 gap-2 sm:grid-cols-5">
      {steps.map((step, index) => {
        const done = index <= current;
        const active = index === current;
        return (
          <li
            key={step}
            className={`rounded-lg border px-2.5 py-2 text-center ${
              done
                ? "border-[var(--bv-teal)]/30 bg-[#f3fbf9]"
                : "border-[#e6eaee] bg-white"
            }`}
          >
            <span
              className={`mx-auto mb-1 flex h-6 w-6 items-center justify-center rounded-full text-[11px] font-bold ${
                done
                  ? "bg-[var(--bv-teal)] text-white"
                  : "bg-[#eef1f3] text-[#6b7280]"
              }`}
            >
              {done ? <Check className="h-3.5 w-3.5" strokeWidth={2.5} /> : index + 1}
            </span>
            <p
              className={`text-[11px] leading-tight font-medium sm:text-xs ${
                active ? "text-[#111]" : "text-[#6b7280]"
              }`}
            >
              {labels[step] ?? step}
            </p>
          </li>
        );
      })}
    </ol>
  );
}
