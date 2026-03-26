import { ObjectId } from "mongodb";
import { NextResponse } from "next/server";
import { requireAdminApiAccess } from "@/lib/admin-auth";
import { sendOrderStatusUpdateToCustomer } from "@/lib/email";
import { getMongoClient } from "@/lib/mongodb";
import { Order } from "@/lib/types";

type DbOrder = Omit<Order, "_id"> & { _id: ObjectId };

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const guard = await requireAdminApiAccess();
  if (!guard.ok) return guard.response;

  const { id } = await params;
  if (!ObjectId.isValid(id)) {
    return NextResponse.json({ error: "Geçersiz sipariş." }, { status: 400 });
  }

  const objectId = new ObjectId(id);
  const client = await getMongoClient();
  const db = client.db(process.env.MONGODB_DB ?? "oar-ore");
  const ordersCollection = db.collection<DbOrder>("orders");
  const order = await ordersCollection.findOne({ _id: objectId });

  if (!order) {
    return NextResponse.json({ error: "Sipariş bulunamadı." }, { status: 404 });
  }

  if (order.status === "Ödeme Alındı" && order.paymentVerifiedAt) {
    return NextResponse.json({ ok: true, alreadyVerified: true });
  }

  const now = new Date().toISOString();
  await ordersCollection.updateOne(
    { _id: objectId },
    {
      $set: {
        status: "Ödeme Alındı",
        paymentVerifiedAt: now,
        paymentVerificationSource: "manual",
        updatedAt: now,
      },
    },
  );

  try {
    const orderForEmail: Order = {
      ...(order as unknown as Order),
      _id: undefined,
      status: "Ödeme Alındı",
      paymentVerifiedAt: now,
    };
    await sendOrderStatusUpdateToCustomer(orderForEmail, id, "Ödeme Alındı");
  } catch {
    // Mail başarısız olsa da durum güncellemesi korunur.
  }

  return NextResponse.json({ ok: true, alreadyVerified: false, paymentVerifiedAt: now });
}
