import { NextResponse } from "next/server";
import { requireAdminApiAccess } from "@/lib/admin-auth";
import { getOrderById, updateOrderFields } from "@/lib/db-orders";
import { sendPaymentReminderToCustomer } from "@/lib/email";

type ReminderTone = "gentle" | "urgent";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const guard = await requireAdminApiAccess();
  if (!guard.ok) return guard.response;

  const { id } = await params;
  const body = (await request.json().catch(() => null)) as { tone?: ReminderTone } | null;
  const tone: ReminderTone = body?.tone === "urgent" ? "urgent" : "gentle";

  const order = await getOrderById(id);
  if (!order) {
    return NextResponse.json({ error: "Sipariş bulunamadı." }, { status: 404 });
  }

  if (order.status !== "Beklemede") {
    return NextResponse.json({ error: "Hatırlatma sadece beklemedeki siparişlerde gönderilebilir." }, { status: 400 });
  }

  try {
    await sendPaymentReminderToCustomer({ ...order, _id: undefined }, id, tone);
  } catch {
    return NextResponse.json({ error: "Hatırlatma maili gönderilemedi." }, { status: 500 });
  }

  await updateOrderFields(id, {
    lastPaymentReminderAt: new Date(),
    paymentReminderCount: { increment: 1 },
  });

  return NextResponse.json({ ok: true });
}
