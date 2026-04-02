import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { normalizeEmail, readSessionToken, SESSION_COOKIE_NAME } from "@/lib/auth";
import { createSupportRequest } from "@/lib/db-support-requests";
import { sendSupportRequestNotification } from "@/lib/email";
import { getOrderById } from "@/lib/db-orders";

type CreateSupportRequestPayload = {
  orderId?: string;
  productId?: string;
  productName?: string;
  productVariant?: string;
  subject?: string;
  message?: string;
};

function normalizeText(value: unknown, max = 300) {
  return String(value ?? "").trim().slice(0, max);
}

export async function POST(request: Request) {
  const token = (await cookies()).get(SESSION_COOKIE_NAME)?.value;
  const sessionUser = readSessionToken(token);
  if (!sessionUser) {
    return NextResponse.json({ error: "Talep açmak için giriş yapmalısınız." }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as CreateSupportRequestPayload | null;
  const orderId = normalizeText(body?.orderId, 64);
  const productId = normalizeText(body?.productId, 120);
  const productName = normalizeText(body?.productName, 180);
  const productVariant = normalizeText(body?.productVariant, 120);
  const subject = normalizeText(body?.subject, 160);
  const message = normalizeText(body?.message, 2500);

  if (!orderId) {
    return NextResponse.json({ error: "Geçerli bir sipariş seçin." }, { status: 400 });
  }
  if (!productId || !productName) {
    return NextResponse.json({ error: "Talep için ürün seçimi zorunlu." }, { status: 400 });
  }
  if (subject.length < 4) {
    return NextResponse.json({ error: "Konu en az 4 karakter olmalı." }, { status: 400 });
  }
  if (message.length < 10) {
    return NextResponse.json({ error: "Mesaj en az 10 karakter olmalı." }, { status: 400 });
  }

  const order = await getOrderById(orderId);
  if (!order) {
    return NextResponse.json({ error: "Sipariş bulunamadı." }, { status: 404 });
  }

  const emailMatches = normalizeEmail(String(order.shipping.email ?? "")) === normalizeEmail(sessionUser.email);
  const userMatches = order.userId ? order.userId === sessionUser.id : emailMatches;
  if (!userMatches) {
    return NextResponse.json({ error: "Bu sipariş için talep açamazsınız." }, { status: 403 });
  }

  const selectedItem = order.items.find((item) => item.productId === productId);
  if (!selectedItem) {
    return NextResponse.json({ error: "Seçilen ürün bu siparişte bulunamadı." }, { status: 400 });
  }

  const now = new Date().toISOString();
  const supportRequest = await createSupportRequest({
    orderId,
    userId: sessionUser.id,
    userEmail: sessionUser.email,
    userName: sessionUser.name,
    productId,
    productName: selectedItem.name || productName,
    productVariant: productVariant || selectedItem.coatingName || undefined,
    subject,
    message,
    replies: [],
    replyCount: 0,
    status: "Yeni",
    createdAt: now,
    updatedAt: now,
  });

  try {
    await sendSupportRequestNotification({ ...supportRequest, _id: undefined }, supportRequest._id ?? "");
  } catch {
    // Mail hatası talep açılmasını bozmasın.
  }

  return NextResponse.json({ ok: true, requestId: supportRequest._id });
}
