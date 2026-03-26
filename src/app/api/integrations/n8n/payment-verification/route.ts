import { ObjectId } from "mongodb";
import { NextResponse } from "next/server";
import { sendOrderStatusUpdateToCustomer } from "@/lib/email";
import { getMongoClient } from "@/lib/mongodb";
import { isValidN8nVerificationSecret } from "@/lib/payment-automation";
import { Order } from "@/lib/types";

type VerifyPaymentPayload = {
  orderId?: string;
  verified?: boolean;
  receiptUrl?: string;
  transactionRef?: string;
  note?: string;
  paidAmount?: number;
  verifiedAt?: string;
};

type DbOrder = Omit<Order, "_id"> & { _id: ObjectId };

function normalizeShortText(value: unknown, maxLen: number) {
  const text = String(value ?? "").trim();
  if (!text) return "";
  return text.slice(0, maxLen);
}

function parseVerifiedAt(input: unknown) {
  const raw = String(input ?? "").trim();
  if (!raw) return new Date().toISOString();
  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) return new Date().toISOString();
  return date.toISOString();
}

function normalizePaidAmount(input: unknown) {
  const parsed = Number(input);
  if (!Number.isFinite(parsed) || parsed < 0) return null;
  return Math.round(parsed);
}

export async function POST(request: Request) {
  if (!isValidN8nVerificationSecret(request)) {
    return NextResponse.json({ error: "Unauthorized webhook request." }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as VerifyPaymentPayload | null;
  const orderId = String(body?.orderId ?? "").trim();
  if (!ObjectId.isValid(orderId)) {
    return NextResponse.json({ error: "Geçersiz orderId." }, { status: 400 });
  }

  const verified = body?.verified === true;
  const receiptUrl = normalizeShortText(body?.receiptUrl, 600);
  const transactionRef = normalizeShortText(body?.transactionRef, 120);
  const note = normalizeShortText(body?.note, 1000);
  const paidAmount = normalizePaidAmount(body?.paidAmount);
  const verifiedAt = parseVerifiedAt(body?.verifiedAt);

  const client = await getMongoClient();
  const db = client.db(process.env.MONGODB_DB ?? "oar-ore");
  const ordersCollection = db.collection<DbOrder>("orders");

  const objectId = new ObjectId(orderId);
  const order = await ordersCollection.findOne({ _id: objectId });
  if (!order) {
    return NextResponse.json({ error: "Sipariş bulunamadı." }, { status: 404 });
  }

  const now = new Date().toISOString();
  const updatePayload: Record<string, unknown> = {
    updatedAt: now,
    paymentVerificationSource: "n8n",
    ...(note ? { paymentVerificationNote: note } : {}),
    ...(receiptUrl ? { paymentReceiptUrl: receiptUrl } : {}),
    ...(transactionRef ? { paymentTransactionRef: transactionRef } : {}),
    ...(paidAmount !== null ? { paymentPaidAmount: paidAmount } : {}),
  };

  if (verified) {
    updatePayload.status = "Ödeme Alındı";
    updatePayload.paymentVerifiedAt = verifiedAt;
    if (!order.paymentNotifiedAt) {
      updatePayload.paymentNotifiedAt = now;
    }
  } else {
    updatePayload.paymentVerificationFailedAt = now;
  }

  await ordersCollection.updateOne({ _id: objectId }, { $set: updatePayload });

  if (verified && order.status !== "Ödeme Alındı") {
    try {
      const nextOrder: Order = {
        ...(order as unknown as Order),
        _id: undefined,
        status: "Ödeme Alındı",
        paymentVerifiedAt: verifiedAt,
      };
      await sendOrderStatusUpdateToCustomer(nextOrder, orderId, "Ödeme Alındı");
    } catch {
      // Müşteri bildirim maili başarısız olsa da webhook başarılı kabul edilir.
    }
  }

  return NextResponse.json({
    ok: true,
    orderId,
    verified,
    status: verified ? "Ödeme Alındı" : order.status,
    paymentVerifiedAt: verified ? verifiedAt : null,
  });
}
