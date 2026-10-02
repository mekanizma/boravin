import { getAppUrl } from "@/lib/env/app-url";
import { orderStatusLabel, type OrderStatus } from "@/lib/orders/status";

type NotifyInput = {
  orderNumber: string;
  status: OrderStatus;
  previousStatus?: string | null;
  trackingNumber?: string | null;
  shippingCarrier?: string | null;
  customerPhone?: string | null;
  customerName?: string | null;
};

/** TR / KKTC phones → digits only with country code (no +). */
export function toWhatsAppDigits(phone: string | null | undefined) {
  if (!phone) return null;
  let digits = phone.replace(/\D/g, "");
  if (!digits) return null;
  if (digits.startsWith("00")) digits = digits.slice(2);
  // Local TR/KKTC mobile: 05xxxxxxxxx → 905xxxxxxxxx
  if (digits.startsWith("05") && digits.length === 11) {
    digits = `90${digits.slice(1)}`;
  }
  // 5xxxxxxxxx (10 digits) → 905xxxxxxxxx
  if (digits.length === 10 && digits.startsWith("5")) {
    digits = `90${digits}`;
  }
  // Already 905… / 90392…
  if (digits.length < 10 || digits.length > 15) return null;
  return digits;
}

function buildStatusMessage(input: NotifyInput) {
  const label = orderStatusLabel(input.status);
  const name = input.customerName?.trim() || "Müşterimiz";
  const trackUrl = `${getAppUrl()}/siparis-takip/${input.orderNumber}`;
  const lines = [
    `Merhaba ${name},`,
    `Boravin siparişiniz güncellendi.`,
    `Sipariş no: ${input.orderNumber}`,
    `Yeni durum: ${label}`,
  ];
  if (input.status === "shipped") {
    if (input.shippingCarrier) {
      lines.push(`Kargo: ${input.shippingCarrier}`);
    }
    if (input.trackingNumber) {
      lines.push(`Takip no: ${input.trackingNumber}`);
    }
  }
  lines.push(`Takip: ${trackUrl}`);
  lines.push("Sorularınız için bu WhatsApp hattından yazabilirsiniz.");
  return lines.join("\n");
}

function notifyStatuses(): Set<string> {
  const raw =
    process.env.WHATSAPP_NOTIFY_STATUSES?.trim() ||
    "accepted,preparing,shipped,delivered,cancelled";
  return new Set(
    raw
      .split(",")
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean),
  );
}

async function sendViaWebhook(to: string, body: string, input: NotifyInput) {
  const url = process.env.WHATSAPP_NOTIFY_WEBHOOK_URL?.trim();
  if (!url) return { ok: false as const, skipped: true as const };

  const res = await fetch(url, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      ...(process.env.WHATSAPP_NOTIFY_WEBHOOK_TOKEN?.trim()
        ? {
            authorization: `Bearer ${process.env.WHATSAPP_NOTIFY_WEBHOOK_TOKEN.trim()}`,
          }
        : {}),
    },
    body: JSON.stringify({
      channel: "whatsapp",
      to,
      text: body,
      orderNumber: input.orderNumber,
      status: input.status,
      statusLabel: orderStatusLabel(input.status),
      trackingNumber: input.trackingNumber ?? null,
      shippingCarrier: input.shippingCarrier ?? null,
    }),
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => "");
    throw new Error(`Webhook ${res.status}: ${errText.slice(0, 200)}`);
  }
  return { ok: true as const, provider: "webhook" as const };
}

async function sendViaMeta(to: string, body: string, input: NotifyInput) {
  const token = process.env.WHATSAPP_ACCESS_TOKEN?.trim();
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID?.trim();
  if (!token || !phoneNumberId) {
    return { ok: false as const, skipped: true as const };
  }

  const template = process.env.WHATSAPP_STATUS_TEMPLATE?.trim();
  const language =
    process.env.WHATSAPP_STATUS_TEMPLATE_LANG?.trim() || "tr";

  const payload = template
    ? {
        messaging_product: "whatsapp",
        to,
        type: "template",
        template: {
          name: template,
          language: { code: language },
          components: [
            {
              type: "body",
              parameters: [
                { type: "text", text: input.orderNumber },
                { type: "text", text: orderStatusLabel(input.status) },
                {
                  type: "text",
                  text: input.trackingNumber?.trim() || "-",
                },
              ],
            },
          ],
        },
      }
    : {
        messaging_product: "whatsapp",
        to,
        type: "text",
        text: { preview_url: true, body },
      };

  const res = await fetch(
    `https://graph.facebook.com/v21.0/${phoneNumberId}/messages`,
    {
      method: "POST",
      headers: {
        authorization: `Bearer ${token}`,
        "content-type": "application/json",
      },
      body: JSON.stringify(payload),
    },
  );

  if (!res.ok) {
    const errText = await res.text().catch(() => "");
    throw new Error(`Meta ${res.status}: ${errText.slice(0, 300)}`);
  }
  return { ok: true as const, provider: "meta" as const };
}

/**
 * Best-effort WhatsApp notify after admin order status change.
 * Never throws to the caller — failures are logged only.
 */
export async function notifyOrderStatusWhatsApp(input: NotifyInput) {
  try {
    if (!notifyStatuses().has(input.status)) {
      return { ok: false as const, skipped: true as const, reason: "status" };
    }

    const to = toWhatsAppDigits(input.customerPhone);
    if (!to) {
      return { ok: false as const, skipped: true as const, reason: "no_phone" };
    }

    const body = buildStatusMessage(input);

    const webhook = await sendViaWebhook(to, body, input);
    if (webhook.ok) return webhook;
    if (!("skipped" in webhook && webhook.skipped)) return webhook;

    const meta = await sendViaMeta(to, body, input);
    if (meta.ok) return meta;

    return {
      ok: false as const,
      skipped: true as const,
      reason: "not_configured" as const,
    };
  } catch (error) {
    console.error("[whatsapp-notify]", input.orderNumber, error);
    return { ok: false as const, error: String(error) };
  }
}

export function isWhatsAppNotifyConfigured() {
  return Boolean(
    process.env.WHATSAPP_NOTIFY_WEBHOOK_URL?.trim() ||
      (process.env.WHATSAPP_ACCESS_TOKEN?.trim() &&
        process.env.WHATSAPP_PHONE_NUMBER_ID?.trim()),
  );
}
