import { NextResponse } from "next/server";
import { requireAdminApiAccess } from "@/lib/admin-auth";
import {
  deleteOrderAndRestoreStock,
  getOrderById,
  StockConflictError,
  updateOrderFields,
  updateOrderStatus,
} from "@/lib/db-orders";
import { sendOrderStatusUpdateToCustomer, sendPaymentApprovedToCustomer } from "@/lib/email";
import { OrderStatus } from "@/lib/types";

const allowedStatuses: OrderStatus[] = [
  "Beklemede",
  "Ödeme Alındı",
  "Sipariş Hazırlanıyor",
  "Kargoya Verildi",
  "Tamamlandı",
];

async function updateStatus(id: string, status: string) {
  if (!allowedStatuses.includes(status as OrderStatus)) {
    return NextResponse.json({ error: "Invalid status" }, { status: 400 });
  }

  const order = await getOrderById(id);
  if (!order) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const previousStatus = order.status;
  const nextStatus = status as OrderStatus;
  const updated = await updateOrderStatus(id, nextStatus);

  if (previousStatus !== nextStatus) {
    try {
      await sendOrderStatusUpdateToCustomer({ ...updated, _id: undefined }, id, nextStatus);
    } catch (err) {
      console.error("[admin/orders] status email failed", err);
      // E-posta hatası durum güncellemesini bozmasın.
    }

    if (nextStatus === "Ödeme Alındı") {
      try {
        await sendPaymentApprovedToCustomer({ ...updated, _id: undefined }, id);
      } catch (err) {
        console.error("[admin/orders] payment-approved email failed", err);
        // Ek onay maili başarısız olsa da durum kaydı korunur.
      }
    }
  }

  return NextResponse.json({ ok: true });
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const guard = await requireAdminApiAccess();
  if (!guard.ok) return guard.response;

  const { id } = await params;
  const body = (await request.json()) as { status?: string; trackingNumber?: string };

  if (typeof body.trackingNumber !== "undefined") {
    const trackingNumber = String(body.trackingNumber ?? "").trim();
    const order = await getOrderById(id);
    if (!order) return NextResponse.json({ error: "Not found" }, { status: 404 });
    const patched = await updateOrderFields(id, { trackingNumber: trackingNumber || null });
    return NextResponse.json({ ok: true, trackingNumber: patched.trackingNumber });
  }

  return updateStatus(id, body.status ?? "");
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const guard = await requireAdminApiAccess();
  if (!guard.ok) return guard.response;

  const { id } = await params;
  const formData = await request.formData();
  const method = String(formData.get("_method") ?? "");
  const status = String(formData.get("status") ?? "");

  if (method.toUpperCase() === "PATCH") {
    return updateStatus(id, status);
  }

  return NextResponse.json({ error: "Method not allowed" }, { status: 405 });
}

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const guard = await requireAdminApiAccess();
  if (!guard.ok) return guard.response;

  const { id } = await params;
  const order = await getOrderById(id);
  if (!order) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(order);
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const guard = await requireAdminApiAccess();
  if (!guard.ok) return guard.response;

  const { id } = await params;
  try {
    const order = await deleteOrderAndRestoreStock(id);
    if (!order) {
      return NextResponse.json({ error: "Sipariş bulunamadı." }, { status: 404 });
    }
    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof StockConflictError) {
      return NextResponse.json({ error: err.message }, { status: 409 });
    }
    return NextResponse.json({ error: "Sipariş silinemedi." }, { status: 500 });
  }
}
