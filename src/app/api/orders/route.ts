import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { readSessionToken, SESSION_COOKIE_NAME } from "@/lib/auth";
import {
  CouponValidationError,
  createOrderForUser,
  listOrdersForUser,
  normalizeCustomerNote,
  normalizeOrderItems,
  StockConflictError,
} from "@/lib/db-orders";
import { sendOrderConfirmationToCustomer, sendOrderNotification } from "@/lib/email";
import { OrderItem, ShippingInfo } from "@/lib/types";

type CreateOrderPayload = {
  items: OrderItem[];
  shipping: ShippingInfo;
  customerNote?: string;
  couponCode?: string;
  total: number;
};

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

    const order = await createOrderForUser({
      user: sessionUser,
      items: normalizedItems,
      shipping: payload.shipping,
      customerNote: customerNote || undefined,
      couponCode: String(payload.couponCode ?? "").trim() || undefined,
    });

    try {
      await sendOrderNotification({ ...order, _id: undefined }, order._id ?? "");
    } catch {
      // E-posta hatası sipariş akışını bozmasın.
    }

    try {
      await sendOrderConfirmationToCustomer({ ...order, _id: undefined }, order._id ?? "");
    } catch {
      // Müşteri onay maili başarısız olsa da sipariş oluşumu devam etsin.
    }

    return NextResponse.json({ orderId: order._id });
  } catch (err) {
    if (err instanceof StockConflictError) {
      return NextResponse.json({ error: err.message }, { status: 409 });
    }
    if (err instanceof CouponValidationError) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    return NextResponse.json({ error: "Sipariş oluşturulamadı." }, { status: 500 });
  }
}

export async function GET() {
  const token = (await cookies()).get(SESSION_COOKIE_NAME)?.value;
  const sessionUser = readSessionToken(token);
  if (!sessionUser) {
    return NextResponse.json({ error: "Giriş gerekli." }, { status: 401 });
  }

  const orders = await listOrdersForUser(sessionUser.id);
  return NextResponse.json(orders);
}

export async function PATCH() {
  return NextResponse.json({ error: "Not allowed" }, { status: 405 });
}
