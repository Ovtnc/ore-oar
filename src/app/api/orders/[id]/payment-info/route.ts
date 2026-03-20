import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { normalizeEmail, readSessionToken, SESSION_COOKIE_NAME } from "@/lib/auth";
import { assignLeastUsedPriorityRandomIban, fallbackPaymentIbanValue } from "@/lib/db-payment-settings";
import { getMongoClient } from "@/lib/mongodb";

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

  if (order.paymentIban && String(order.paymentIban).trim()) {
    return NextResponse.json({
      iban: String(order.paymentIban),
      ibanLabel: String(order.paymentIbanLabel ?? ""),
      accountHolderName: String(order.paymentIbanAccountHolder ?? ""),
      ibanId: String(order.paymentIbanId ?? ""),
    });
  }

  // Eski siparişler için atanmamışsa burada bir kez atanır.
  const selected = await assignLeastUsedPriorityRandomIban();
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

  return NextResponse.json({
    iban: selected.iban,
    ibanLabel: selected.label,
    accountHolderName: selected.accountHolderName,
    ibanId: selected.id,
    fallback: fallbackPaymentIbanValue() === selected.iban,
  });
}
