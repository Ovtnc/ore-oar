import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { readSessionToken, SESSION_COOKIE_NAME } from "@/lib/auth";
import { assignLeastUsedPriorityRandomIban } from "@/lib/db-payment-settings";
import { fetchShippingPricingSettings } from "@/lib/db-shipping-settings";
import { getMongoClient } from "@/lib/mongodb";
import { toSafePrice } from "@/lib/price";
import { calculateOrderTotalWithConfig } from "@/lib/shipping";
import { sendOrderNotification } from "@/lib/email";
import { Order, OrderItem, ShippingInfo } from "@/lib/types";

type CreateOrderPayload = {
  items: OrderItem[];
  shipping: ShippingInfo;
  customerNote?: string;
  total: number;
};

function toPositiveInt(value: unknown) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return 0;
  return Math.max(0, Math.trunc(parsed));
}

function normalizeOrderItems(input: unknown) {
  if (!Array.isArray(input)) return [];
  const normalized: OrderItem[] = [];
  for (const item of input) {
    const row = item as Partial<OrderItem> | undefined;
    const productId = String(row?.productId ?? "").trim();
    const name = String(row?.name ?? "").trim();
    const quantity = toPositiveInt(row?.quantity);
    if (!productId || !name || quantity <= 0) continue;

    normalized.push({
      productId,
      name,
      quantity,
      price: toSafePrice(row?.price ?? 0),
      coatingOptionId: row?.coatingOptionId ? String(row.coatingOptionId) : undefined,
      coatingName: row?.coatingName ? String(row.coatingName) : undefined,
      coatingPriceDelta: toSafePrice(row?.coatingPriceDelta ?? 0),
    });
  }
  return normalized;
}

function aggregateStockDemand(items: OrderItem[]) {
  const map = new Map<string, number>();
  for (const item of items) {
    const next = (map.get(item.productId) ?? 0) + toPositiveInt(item.quantity);
    map.set(item.productId, next);
  }
  return map;
}

function calculateItemsSubtotal(items: OrderItem[]) {
  return items.reduce((sum, item) => {
    const unitPrice = toSafePrice(item.price);
    const quantity = toPositiveInt(item.quantity);
    return sum + unitPrice * quantity;
  }, 0);
}

function normalizeCustomerNote(input: unknown) {
  const note = String(input ?? "").trim();
  if (!note) return "";
  return note.slice(0, 400);
}

export async function POST(request: Request) {
  const token = (await cookies()).get(SESSION_COOKIE_NAME)?.value;
  const sessionUser = readSessionToken(token);
  if (!sessionUser) {
    return NextResponse.json({ error: "Sipariş vermek için giriş yapmalısınız." }, { status: 401 });
  }

  try {
    const payload = (await request.json()) as CreateOrderPayload;
    const normalizedItems = normalizeOrderItems(payload.items);
    const customerNote = normalizeCustomerNote(payload.customerNote);
    if (normalizedItems.length === 0) {
      return NextResponse.json({ error: "Sipariş sepeti boş görünüyor." }, { status: 400 });
    }

    const client = await getMongoClient();
    const db = client.db(process.env.MONGODB_DB ?? "oar-ore");
    const stockDemand = aggregateStockDemand(normalizedItems);
    const decrementedRows: Array<{ productId: string; quantity: number }> = [];

    for (const [productId, quantity] of stockDemand.entries()) {
      const result = await db
        .collection("products")
        .updateOne(
          { $or: [{ id: productId }, { slug: productId }], stock: { $gte: quantity } },
          { $inc: { stock: -quantity } },
        );

      if (result.modifiedCount !== 1) {
        for (const reverted of decrementedRows) {
          await db
            .collection("products")
            .updateOne(
              { $or: [{ id: reverted.productId }, { slug: reverted.productId }] },
              { $inc: { stock: reverted.quantity } },
            );
        }
        return NextResponse.json(
          { error: "Bazı ürünlerde stok yetersiz. Lütfen sepeti güncelleyin." },
          { status: 409 },
        );
      }

      decrementedRows.push({ productId, quantity });
    }

    const selectedPaymentIban = await assignLeastUsedPriorityRandomIban();
    const subtotal = calculateItemsSubtotal(normalizedItems);
    const shippingSettings = await fetchShippingPricingSettings();
    const totals = calculateOrderTotalWithConfig(subtotal, shippingSettings);

    const order: Order = {
      userId: sessionUser.id,
      userEmail: sessionUser.email,
      items: normalizedItems,
      customerNote: customerNote || undefined,
      shipping: payload.shipping,
      subtotal: totals.subtotal,
      shippingFee: totals.shippingFee,
      total: totals.grandTotal,
      status: "Beklemede",
      createdAt: new Date().toISOString(),
      paymentIban: selectedPaymentIban.iban,
      paymentIbanId: selectedPaymentIban.id,
      paymentIbanLabel: selectedPaymentIban.label,
      paymentIbanAccountHolder: selectedPaymentIban.accountHolderName,
    };

    let orderId = "";
    try {
      const result = await db.collection<Order>("orders").insertOne(order);
      orderId = result.insertedId.toString();
    } catch {
      for (const reverted of decrementedRows) {
        await db
          .collection("products")
          .updateOne(
            { $or: [{ id: reverted.productId }, { slug: reverted.productId }] },
            { $inc: { stock: reverted.quantity } },
          );
      }
      return NextResponse.json({ error: "Sipariş kaydedilemedi. Lütfen tekrar deneyin." }, { status: 500 });
    }

    try {
      await sendOrderNotification(order, orderId);
    } catch {
      // E-posta hatası sipariş akışını bozmasın.
    }

    return NextResponse.json({ orderId });
  } catch {
    return NextResponse.json({ error: "Sipariş oluşturulamadı." }, { status: 500 });
  }
}

export async function GET() {
  const token = (await cookies()).get(SESSION_COOKIE_NAME)?.value;
  const sessionUser = readSessionToken(token);
  if (!sessionUser) {
    return NextResponse.json({ error: "Giriş gerekli." }, { status: 401 });
  }

  const client = await getMongoClient();
  const db = client.db(process.env.MONGODB_DB ?? "oar-ore");
  const orders = await db
    .collection<Order>("orders")
    .find({ userId: sessionUser.id })
    .sort({ createdAt: -1 })
    .toArray();
  return NextResponse.json(
    orders.map((order) => ({
      ...order,
      _id:
        typeof order._id === "string"
          ? order._id
          : (order._id as { toString?: () => string } | undefined)?.toString?.(),
    })),
  );
}

export async function PATCH() {
  return NextResponse.json({ error: "Not allowed" }, { status: 405 });
}
