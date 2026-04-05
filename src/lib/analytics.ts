export type AnalyticsItem = {
  productId: string;
  price: number;
  quantity?: number;
};

type AnalyticsEventName = "view_item" | "add_to_cart" | "begin_checkout" | "purchase";

type AnalyticsPayload = {
  productId: string;
  price: number;
  items: AnalyticsItem[];
  value?: number;
  quantity?: number;
  orderId?: string;
  currency?: string;
};

declare global {
  interface Window {
    dataLayer?: Record<string, unknown>[];
  }
}

function toSafePrice(value: unknown) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : 0;
}

function normalizeItems(items: AnalyticsItem[]) {
  return items.map((item) => ({
    productId: String(item.productId),
    price: toSafePrice(item.price),
    quantity: Math.max(1, Number(item.quantity ?? 1)),
  }));
}

function emitAnalyticsEvent(eventName: AnalyticsEventName, payload: AnalyticsPayload) {
  if (typeof window === "undefined") return;

  const eventData = {
    event: eventName,
    eventName,
    timestamp: new Date().toISOString(),
    ...payload,
  };

  window.dataLayer = window.dataLayer ?? [];
  window.dataLayer.push(eventData);
  window.dispatchEvent(new CustomEvent("oar-ore:analytics", { detail: eventData }));

  if (process.env.NODE_ENV !== "production") {
    console.info(`[analytics] ${eventName}`, eventData);
  }
}

export function trackViewItem(input: {
  productId: string;
  price: number;
  currency?: string;
}) {
  const productId = String(input.productId);
  const price = toSafePrice(input.price);
  emitAnalyticsEvent("view_item", {
    productId,
    price,
    items: [{ productId, price, quantity: 1 }],
    quantity: 1,
    currency: input.currency ?? "TRY",
    value: price,
  });
}

export function trackAddToCart(input: {
  productId: string;
  price: number;
  quantity?: number;
  currency?: string;
}) {
  const productId = String(input.productId);
  const price = toSafePrice(input.price);
  const quantity = Math.max(1, Number(input.quantity ?? 1));
  emitAnalyticsEvent("add_to_cart", {
    productId,
    price,
    items: [{ productId, price, quantity }],
    quantity,
    value: price * quantity,
    currency: input.currency ?? "TRY",
  });
}

export function trackBeginCheckout(input: {
  items: AnalyticsItem[];
  totalValue?: number;
  currency?: string;
}) {
  const items = normalizeItems(input.items);
  const first = items[0] ?? { productId: "", price: 0, quantity: 1 };
  const computedTotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);

  emitAnalyticsEvent("begin_checkout", {
    productId: first.productId,
    price: first.price,
    items,
    value: toSafePrice(input.totalValue ?? computedTotal),
    currency: input.currency ?? "TRY",
  });
}

export function trackPurchase(input: {
  orderId: string;
  items: AnalyticsItem[];
  totalValue: number;
  currency?: string;
}) {
  const items = normalizeItems(input.items);
  const first = items[0] ?? { productId: "", price: 0, quantity: 1 };

  emitAnalyticsEvent("purchase", {
    productId: first.productId,
    price: first.price,
    items,
    value: toSafePrice(input.totalValue),
    orderId: input.orderId,
    currency: input.currency ?? "TRY",
  });
}

