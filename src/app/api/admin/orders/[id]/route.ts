import { NextResponse } from "next/server";
import { requireAdminApiAccess } from "@/lib/admin-auth";
import { deleteOrderAndRestoreStock, getOrderById, StockConflictError, updateOrderStatus } from "@/lib/db-orders";
import { sendOrderStatusUpdateToCustomer } from "@/lib/email";
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
    } catch {
      // E-posta hatası durum güncellemesini bozmasın.
    }
  }

  return NextResponse.json({ ok: true });
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const guard = await requireAdminApiAccess();
  if (!guard.ok) return guard.response;

  const { id } = await params;
  const body = (await request.json()) as { status?: string };
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
