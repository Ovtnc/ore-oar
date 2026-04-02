import { NextResponse } from "next/server";
import { getOrderById, updateOrderFields, verifyPayment } from "@/lib/db-orders";
import { sendOrderStatusUpdateToCustomer } from "@/lib/email";
import { isValidN8nVerificationSecret } from "@/lib/payment-automation";

type VerifyPaymentPayload = {
  orderId?: string;
  verified?: boolean;
  receiptUrl?: string;
  transactionRef?: string;
  note?: string;
  paidAmount?: number;
  verifiedAt?: string;
};

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
  if (!orderId) {
    return NextResponse.json({ error: "Geçersiz orderId." }, { status: 400 });
  }

  const verified = body?.verified === true;
  const receiptUrl = normalizeShortText(body?.receiptUrl, 600);
  const transactionRef = normalizeShortText(body?.transactionRef, 120);
  const note = normalizeShortText(body?.note, 1000);
  const paidAmount = normalizePaidAmount(body?.paidAmount);
  const verifiedAt = parseVerifiedAt(body?.verifiedAt);

  const order = await getOrderById(orderId);
  if (!order) {
    return NextResponse.json({ error: "Sipariş bulunamadı." }, { status: 404 });
  }

  if (verified) {
    const updated = await verifyPayment(orderId, "n8n", {
      receiptUrl,
      transactionRef,
      note,
      paidAmount,
      verifiedAt,
    });

    if (order.status !== "Ödeme Alındı") {
      try {
        await sendOrderStatusUpdateToCustomer({ ...updated, _id: undefined }, orderId, "Ödeme Alındı");
      } catch {
        // Müşteri bildirim maili başarısız olsa da webhook başarılı kabul edilir.
      }
    }

    return NextResponse.json({
      ok: true,
      orderId,
      verified: true,
      status: "Ödeme Alındı",
      paymentVerifiedAt: updated.paymentVerifiedAt,
    });
  }

  await updateOrderFields(orderId, {
    paymentVerificationSource: "n8n",
    paymentVerificationNote: note || undefined,
    paymentReceiptUrl: receiptUrl || undefined,
    paymentTransactionRef: transactionRef || undefined,
    paymentPaidAmount: paidAmount ?? undefined,
    paymentVerificationFailedAt: new Date(),
  });

  return NextResponse.json({
    ok: true,
    orderId,
    verified: false,
    status: order.status,
    paymentVerifiedAt: null,
  });
}
