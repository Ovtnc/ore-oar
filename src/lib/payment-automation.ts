import { Order } from "@/lib/types";

type PaymentEventInput = {
  orderId: string;
  order: Order;
};

function buildAppBaseUrl() {
  const raw =
    process.env.APP_BASE_URL?.trim() ||
    process.env.NEXT_PUBLIC_APP_URL?.trim() ||
    process.env.NEXT_PUBLIC_SITE_URL?.trim() ||
    "";
  if (!raw) return "";
  return raw.endsWith("/") ? raw.slice(0, -1) : raw;
}

function buildCallbackUrl() {
  const base = buildAppBaseUrl();
  if (!base) return "";
  return `${base}/api/integrations/n8n/payment-verification`;
}

function buildEventPayload(event: "payment_chat_started" | "payment_notified", input: PaymentEventInput) {
  return {
    event,
    orderId: input.orderId,
    createdAt: new Date().toISOString(),
    callbackUrl: buildCallbackUrl(),
    customer: {
      name: input.order.shipping.fullName,
      email: input.order.shipping.email,
      phone: input.order.shipping.phone,
    },
    payment: {
      total: input.order.total,
      iban: input.order.paymentIban ?? "",
      ibanLabel: input.order.paymentIbanLabel ?? "",
      accountHolder: input.order.paymentIbanAccountHolder ?? "",
      paymentNotifiedAt: input.order.paymentNotifiedAt ?? "",
      paymentChatStartedAt: input.order.paymentChatStartedAt ?? "",
    },
    items: input.order.items.map((item) => ({
      productId: item.productId,
      name: item.name,
      quantity: item.quantity,
      unitPrice: item.price,
      coatingName: item.coatingName ?? "",
    })),
  };
}

async function sendEventToN8n(payload: Record<string, unknown>) {
  const webhookUrl = process.env.N8N_PAYMENT_EVENT_WEBHOOK?.trim();
  if (!webhookUrl) return;

  const authToken = process.env.N8N_PAYMENT_EVENT_TOKEN?.trim();

  const response = await fetch(webhookUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error(`n8n webhook request failed (${response.status}).`);
  }
}

export async function emitPaymentChatStartedToN8n(input: PaymentEventInput) {
  await sendEventToN8n(buildEventPayload("payment_chat_started", input));
}

export async function emitPaymentNotifiedToN8n(input: PaymentEventInput) {
  await sendEventToN8n(buildEventPayload("payment_notified", input));
}

export function isValidN8nVerificationSecret(request: Request) {
  const expected = process.env.N8N_PAYMENT_VERIFY_SECRET?.trim();
  if (!expected) {
    return false;
  }

  const fromHeader = request.headers.get("x-n8n-secret")?.trim();
  if (fromHeader && fromHeader === expected) {
    return true;
  }

  const authHeader = request.headers.get("authorization") ?? "";
  if (authHeader.startsWith("Bearer ")) {
    const token = authHeader.slice("Bearer ".length).trim();
    if (token === expected) return true;
  }

  return false;
}
