import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { normalizeEmail, readSessionToken, SESSION_COOKIE_NAME } from "@/lib/auth";
import {
  assignLeastUsedPriorityRandomIban,
  fallbackPaymentIbanValue,
  fetchOrderWhatsappNumber,
} from "@/lib/db-payment-settings";
import { getMongoClient } from "@/lib/mongodb";
import { Order } from "@/lib/types";

function formatCurrency(value: unknown) {
  return `${Number(value ?? 0).toLocaleString("tr-TR")} TL`;
}

function buildWhatsappMessage(order: Order, orderId: string) {
  const itemLines = (order.items ?? [])
    .map((item) => {
      const coatingLabel = item.coatingName ? ` (${item.coatingName})` : "";
      const qty = Number(item.quantity ?? 0);
      const lineTotal = Number(item.price ?? 0) * qty;
      return `- ${item.name}${coatingLabel} x${qty} (${formatCurrency(lineTotal)})`;
    })
    .join("\n");

  return [
    "Merhaba, siparişimin ödeme sürecini başlatmak istiyorum.",
    `Sipariş No: #${orderId}`,
    `Müşteri: ${order.shipping.fullName}`,
    `Telefon: ${order.shipping.phone}`,
    `Toplam: ${formatCurrency(order.total)}`,
    "Ürünler:",
    itemLines || "-",
    "Ödeme bilgilerini ve IBAN detayını paylaşır mısınız?",
    "Ödeme sonrası dekontumu bu sohbetten ileteceğim.",
  ].join("\n");
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const token = (await cookies()).get(SESSION_COOKIE_NAME)?.value;
  const sessionUser = readSessionToken(token);
  if (!sessionUser) {
    return NextResponse.json({ error: "Giriş gerekli." }, { status: 401 });
  }

  const { id } = await params;
  if (!ObjectId.isValid(id)) {
    return NextResponse.json({ error: "Geçersiz sipariş." }, { status: 400 });
  }

  const client = await getMongoClient();
  const db = client.db(process.env.MONGODB_DB ?? "oar-ore");
  const ordersCollection = db.collection("orders");
  const objectId = new ObjectId(id);

  const order = await ordersCollection.findOne({ _id: objectId });
  if (!order) {
    return NextResponse.json({ error: "Order not found" }, { status: 404 });
  }

  const emailMatches =
    normalizeEmail(String(order.shipping?.email ?? "")) === normalizeEmail(sessionUser.email);
  const userMatches = order.userId ? order.userId === sessionUser.id : emailMatches;
  if (!userMatches) {
    return NextResponse.json({ error: "Bu sipariş için yetkiniz yok." }, { status: 403 });
  }

  let resolvedIban = String(order.paymentIban ?? "").trim();
  let resolvedIbanId = String(order.paymentIbanId ?? "").trim();
  let resolvedIbanLabel = String(order.paymentIbanLabel ?? "").trim();
  let resolvedAccountHolder = String(order.paymentIbanAccountHolder ?? "").trim();
  let usedFallback = false;

  if (!resolvedIban) {
    // Eski siparişler için atanmamışsa burada bir kez atanır.
    const selected = await assignLeastUsedPriorityRandomIban();
    resolvedIban = selected.iban;
    resolvedIbanId = selected.id;
    resolvedIbanLabel = selected.label;
    resolvedAccountHolder = selected.accountHolderName;
    usedFallback = fallbackPaymentIbanValue() === selected.iban;
    await ordersCollection.updateOne(
      { _id: objectId },
      {
        $set: {
          paymentIban: selected.iban,
          paymentIbanId: selected.id,
          paymentIbanLabel: selected.label,
          paymentIbanAccountHolder: selected.accountHolderName,
        },
      },
    );
  }

  const whatsappNumber = await fetchOrderWhatsappNumber();
  const whatsappMessage = buildWhatsappMessage(
    {
      ...(order as unknown as Order),
      _id: undefined,
    },
    id,
  );
  const whatsappUrl = `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(whatsappMessage)}`;

  return NextResponse.json({
    whatsappNumber,
    whatsappMessage,
    whatsappUrl,
    // Backward-compatible internal fields (UI bunları artık göstermiyor).
    iban: resolvedIban,
    ibanLabel: resolvedIbanLabel,
    accountHolderName: resolvedAccountHolder,
    ibanId: resolvedIbanId,
    fallback: usedFallback,
    paymentChatStartedAt: order.paymentChatStartedAt ?? null,
    paymentNotifiedAt: order.paymentNotifiedAt ?? null,
    paymentVerifiedAt: order.paymentVerifiedAt ?? null,
  });
}
