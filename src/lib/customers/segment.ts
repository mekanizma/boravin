import type { ComponentProps } from "react";
import type { Badge } from "@/components/ui/badge";

type BadgeTone = NonNullable<ComponentProps<typeof Badge>["tone"]>;

export type CustomerSegmentInfo = {
  key: string;
  label: string;
  description: string;
  tone: BadgeTone;
};

const SEGMENT_META: Record<
  string,
  Omit<CustomerSegmentInfo, "key">
> = {
  new: {
    label: "Yeni müşteri",
    description: "Kayıtlı, henüz düzenli alışveriş yok",
    tone: "info",
  },
  returning: {
    label: "Tekrar alıcı",
    description: "Daha önce sipariş vermiş",
    tone: "success",
  },
  vip: {
    label: "VIP müşteri",
    description: "Yüksek değerli / öncelikli",
    tone: "accent",
  },
  inactive: {
    label: "Pasif",
    description: "Uzun süredir sipariş yok",
    tone: "neutral",
  },
  corporate: {
    label: "Kurumsal",
    description: "Firma hesabı",
    tone: "warning",
  },
  whatsapp: {
    label: "WhatsApp",
    description: "WhatsApp üzerinden geldi",
    tone: "info",
  },
};

/** Reports / charts short labels. */
export const CUSTOMER_SEGMENT_LABELS: Record<string, string> = Object.fromEntries(
  Object.entries(SEGMENT_META).map(([key, meta]) => [key, meta.label]),
);

export function resolveCustomerSegment(input: {
  segment: string | null | undefined;
  orderCount?: number | null;
  totalSpent?: string | number | null;
}): CustomerSegmentInfo {
  const raw = (input.segment ?? "").trim().toLowerCase() || "new";
  const orders = Number(input.orderCount ?? 0) || 0;
  const spent = Number(input.totalSpent ?? 0) || 0;

  // Prefer explicit VIP / WhatsApp / inactive / corporate codes.
  if (raw === "vip" || spent >= 25000) {
    return {
      key: "vip",
      label: "VIP müşteri",
      description:
        spent > 0
          ? `Toplam harcama yüksek · ${orders} sipariş`
          : "Yüksek değerli / öncelikli",
      tone: "accent",
    };
  }

  if (raw === "whatsapp") {
    return { key: "whatsapp", ...SEGMENT_META.whatsapp };
  }
  if (raw === "inactive") {
    return {
      key: "inactive",
      ...SEGMENT_META.inactive,
      description:
        orders > 0
          ? `Son dönemde sipariş yok · geçmişte ${orders}`
          : "Uzun süredir sipariş yok",
    };
  }
  if (raw === "corporate") {
    return { key: "corporate", ...SEGMENT_META.corporate };
  }

  if (orders >= 2) {
    return {
      key: "returning",
      label: "Tekrar alıcı",
      description: `${orders} sipariş verdi`,
      tone: "success",
    };
  }

  if (orders === 1) {
    return {
      key: "returning",
      label: "İlk alışverişini yaptı",
      description: "1 sipariş tamamlandı",
      tone: "success",
    };
  }

  if (raw === "returning") {
    return {
      key: "returning",
      label: "Tekrar alıcı",
      description: "Daha önce sipariş vermiş",
      tone: "success",
    };
  }

  const meta = SEGMENT_META[raw] ?? SEGMENT_META.new;
  return {
    key: raw in SEGMENT_META ? raw : "new",
    label: meta.label,
    description:
      orders === 0 ? "Henüz sipariş vermedi" : meta.description,
    tone: meta.tone,
  };
}

export function getCustomerSegmentLabel(segment: string | null | undefined) {
  return resolveCustomerSegment({ segment }).label;
}

export function getCustomerSegmentTone(
  segment: string | null | undefined,
): BadgeTone {
  return resolveCustomerSegment({ segment }).tone;
}
