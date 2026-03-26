import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { normalizeEmail, readSessionToken, SESSION_COOKIE_NAME } from "@/lib/auth";
import { getMongoClient } from "@/lib/mongodb";

export async function POST(
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
    return NextResponse.json({ error: "Sipariş bulunamadı." }, { status: 404 });
  }

  const emailMatches =
    normalizeEmail(String(order.shipping?.email ?? "")) === normalizeEmail(sessionUser.email);
  const userMatches = order.userId ? order.userId === sessionUser.id : emailMatches;
  if (!userMatches) {
    return NextResponse.json({ error: "Bu sipariş için yetkiniz yok." }, { status: 403 });
  }

  const startedAt = order.paymentChatStartedAt || new Date().toISOString();
  if (!order.paymentChatStartedAt) {
    await ordersCollection.updateOne(
      { _id: objectId },
      {
        $set: {
          paymentChatStartedAt: startedAt,
          updatedAt: new Date().toISOString(),
        },
      },
    );
  }

  return NextResponse.json({ ok: true, paymentChatStartedAt: startedAt });
}
