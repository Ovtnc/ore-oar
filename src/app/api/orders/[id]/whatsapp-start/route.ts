import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { normalizeEmail, readSessionToken, SESSION_COOKIE_NAME } from "@/lib/auth";
import { getOrderById, touchPaymentChatStarted } from "@/lib/db-orders";

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const token = (await cookies()).get(SESSION_COOKIE_NAME)?.value;
  const sessionUser = readSessionToken(token);
  if (!sessionUser) {
    return NextResponse.json({ error: "Giriş gerekli." }, { status: 401 });
  }

  const { id } = await params;
  const order = await getOrderById(id);

  if (!order) {
    return NextResponse.json({ error: "Sipariş bulunamadı." }, { status: 404 });
  }

  const emailMatches = normalizeEmail(String(order.shipping?.email ?? "")) === normalizeEmail(sessionUser.email);
  const userMatches = order.userId ? order.userId === sessionUser.id : emailMatches;
  if (!userMatches) {
    return NextResponse.json({ error: "Bu sipariş için yetkiniz yok." }, { status: 403 });
  }

  const updated = await touchPaymentChatStarted(id);
  return NextResponse.json({ ok: true, paymentChatStartedAt: updated?.paymentChatStartedAt ?? order.paymentChatStartedAt });
}
