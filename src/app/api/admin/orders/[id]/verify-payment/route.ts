import { NextResponse } from "next/server";
import { requireAdminApiAccess } from "@/lib/admin-auth";
import { getOrderById, verifyPayment } from "@/lib/db-orders";
import { sendOrderStatusUpdateToCustomer } from "@/lib/email";

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const guard = await requireAdminApiAccess();
  if (!guard.ok) return guard.response;

  const { id } = await params;
  const order = await getOrderById(id);

  if (!order) {
    return NextResponse.json({ error: "Sipariş bulunamadı." }, { status: 404 });
  }

  if (order.status === "Ödeme Alındı" && order.paymentVerifiedAt) {
    return NextResponse.json({ ok: true, alreadyVerified: true });
  }

  const updated = await verifyPayment(id, "manual");

  try {
    await sendOrderStatusUpdateToCustomer({ ...updated, _id: undefined }, id, "Ödeme Alındı");
  } catch {
    // Mail başarısız olsa da durum güncellemesi korunur.
  }

  return NextResponse.json({ ok: true, alreadyVerified: false, paymentVerifiedAt: updated.paymentVerifiedAt });
}
