import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { normalizeEmail, readSessionToken, SESSION_COOKIE_NAME } from "@/lib/auth";
import { getOrderById, markPaymentNotified } from "@/lib/db-orders";
import { sendPaymentNotificationToAdmin } from "@/lib/email";
import { emitPaymentNotifiedToN8n } from "@/lib/payment-automation";

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const token = (await cookies()).get(SESSION_COOKIE_NAME)?.value;
  const sessionUser = readSessionToken(token);
  if (!sessionUser) {
    return NextResponse.json({ error: "Giriş gerekli." }, { status: 401 });
  }

  const { id } = await params;
  const order = await getOrderById(id);

  if (!order) {
    return NextResponse.json({ error: "Order not found" }, { status: 404 });
  }

  const emailMatches = normalizeEmail(String(order.shipping?.email ?? "")) === normalizeEmail(sessionUser.email);
  const userMatches = order.userId ? order.userId === sessionUser.id : emailMatches;
  if (!userMatches) {
    return NextResponse.json({ error: "Bu sipariş için yetkiniz yok." }, { status: 403 });
  }

  const result = await markPaymentNotified(id);
  if (!result) {
    return NextResponse.json({ error: "Order not found" }, { status: 404 });
  }

  if (result.alreadyNotified) {
    return NextResponse.json({ ok: true, alreadyNotified: true });
  }

  try {
    await emitPaymentNotifiedToN8n({ orderId: id, order: { ...result.order, _id: undefined } });
  } catch {
    // n8n entegrasyon hatası müşteri akışını bozmasın.
  }

  try {
    await sendPaymentNotificationToAdmin({ ...result.order, _id: undefined }, id);
  } catch {
    // Admin'e bildirim maili atılamasa bile müşteri akışı devam etsin.
  }
  return NextResponse.json({ ok: true, alreadyNotified: false });
}
