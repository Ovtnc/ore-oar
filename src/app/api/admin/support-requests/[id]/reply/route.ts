import { ObjectId } from "mongodb";
import { NextResponse } from "next/server";
import { requireAdminApiAccess } from "@/lib/admin-auth";
import { sendSupportReplyToCustomer } from "@/lib/email";
import { getMongoClient } from "@/lib/mongodb";
import { Order, SupportRequest } from "@/lib/types";

type DbSupportRequest = Omit<SupportRequest, "_id"> & { _id: ObjectId };
type DbOrder = Omit<Order, "_id"> & { _id: ObjectId };

function normalizeReplyText(value: unknown) {
  return String(value ?? "")
    .trim()
    .replace(/\r\n/g, "\n")
    .slice(0, 2500);
}

function normalizeEmailLike(value: unknown) {
  return String(value ?? "").trim().toLowerCase();
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const guard = await requireAdminApiAccess();
  if (!guard.ok) return guard.response;

  const { id } = await params;
  if (!ObjectId.isValid(id)) {
    return NextResponse.json({ error: "Geçersiz talep." }, { status: 400 });
  }

  const body = (await request.json().catch(() => null)) as { message?: string } | null;
  const message = normalizeReplyText(body?.message);

  if (message.length < 4) {
    return NextResponse.json({ error: "Yanıt en az 4 karakter olmalı." }, { status: 400 });
  }

  const client = await getMongoClient();
  const db = client.db(process.env.MONGODB_DB ?? "oar-ore");
  const collection = db.collection<DbSupportRequest>("support_requests");

  const objectId = new ObjectId(id);
  const supportRequest = await collection.findOne({ _id: objectId });
  if (!supportRequest) {
    return NextResponse.json({ error: "Talep bulunamadı." }, { status: 404 });
  }

  const now = new Date().toISOString();

  try {
    const fallbackRecipients = new Set<string>();
    if (supportRequest.orderId && ObjectId.isValid(supportRequest.orderId)) {
      const order = await db
        .collection<DbOrder>("orders")
        .findOne({ _id: new ObjectId(supportRequest.orderId) });
      if (order?.userEmail) fallbackRecipients.add(normalizeEmailLike(order.userEmail));
      if (order?.shipping?.email) fallbackRecipients.add(normalizeEmailLike(order.shipping.email));
    }

    const requestForEmail: SupportRequest = { ...supportRequest, _id: id };
    await sendSupportReplyToCustomer(requestForEmail, id, message, Array.from(fallbackRecipients));
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Yanıt e-postası gönderilemedi." },
      { status: 500 },
    );
  }

  await collection.updateOne(
    { _id: objectId },
    {
      $set: {
        updatedAt: now,
        lastReplyAt: now,
        status: supportRequest.status === "Yeni" ? "İnceleniyor" : supportRequest.status,
      },
      $inc: { replyCount: 1 },
      $push: {
        replies: {
          message,
          sentAt: now,
          sentByEmail: guard.user.email,
        },
      },
    },
  );

  return NextResponse.json({ ok: true, sentAt: now });
}
