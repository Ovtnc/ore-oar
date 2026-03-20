import { ObjectId } from "mongodb";
import { NextResponse } from "next/server";
import { requireAdminApiAccess } from "@/lib/admin-auth";
import { sendPaymentReminderToCustomer } from "@/lib/email";
import { getMongoClient } from "@/lib/mongodb";
import { Order } from "@/lib/types";

type ReminderTone = "gentle" | "urgent";
type DbOrder = Omit<Order, "_id"> & { _id: ObjectId };

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const guard = await requireAdminApiAccess();
  if (!guard.ok) return guard.response;

  const { id } = await params;
  if (!ObjectId.isValid(id)) {
    return NextResponse.json({ error: "Geçersiz sipariş." }, { status: 400 });
  }

  const body = (await request.json().catch(() => null)) as { tone?: ReminderTone } | null;
  const tone: ReminderTone = body?.tone === "urgent" ? "urgent" : "gentle";

  const client = await getMongoClient();
  const db = client.db(process.env.MONGODB_DB ?? "oar-ore");
  const ordersCollection = db.collection<DbOrder>("orders");

  const objectId = new ObjectId(id);
  const order = await ordersCollection.findOne({ _id: objectId });
  if (!order) {
    return NextResponse.json({ error: "Sipariş bulunamadı." }, { status: 404 });
  }

  if (order.status !== "Beklemede") {
    return NextResponse.json({ error: "Hatırlatma sadece beklemedeki siparişlerde gönderilebilir." }, { status: 400 });
  }

  try {
    const orderForEmail: Order = { ...order, _id: undefined };
    await sendPaymentReminderToCustomer(orderForEmail, id, tone);
  } catch {
    return NextResponse.json({ error: "Hatırlatma maili gönderilemedi." }, { status: 500 });
  }

  await ordersCollection.updateOne(
    { _id: objectId },
    {
      $set: { lastPaymentReminderAt: new Date().toISOString() },
      $inc: { paymentReminderCount: 1 },
    },
  );

  return NextResponse.json({ ok: true });
}
