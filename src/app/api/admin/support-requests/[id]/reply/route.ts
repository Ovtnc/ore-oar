import { NextResponse } from "next/server";
import { requireAdminApiAccess } from "@/lib/admin-auth";
import { appendSupportReply, getSupportRequestById } from "@/lib/db-support-requests";
import { sendSupportReplyToCustomer } from "@/lib/email";
import { getOrderById } from "@/lib/db-orders";

function normalizeReplyText(value: unknown) {
  return String(value ?? "")
    .trim()
    .replace(/\r\n/g, "\n")
    .slice(0, 2500);
}

function normalizeEmailLike(value: unknown) {
  return String(value ?? "").trim().toLowerCase();
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const guard = await requireAdminApiAccess();
  if (!guard.ok) return guard.response;

  const { id } = await params;
  const body = (await request.json().catch(() => null)) as { message?: string } | null;
  const message = normalizeReplyText(body?.message);

  if (message.length < 4) {
    return NextResponse.json({ error: "Yanıt en az 4 karakter olmalı." }, { status: 400 });
  }

  const supportRequest = await getSupportRequestById(id);
  if (!supportRequest) {
    return NextResponse.json({ error: "Talep bulunamadı." }, { status: 404 });
  }

  const now = new Date().toISOString();

  try {
    const fallbackRecipients = new Set<string>();
    if (supportRequest.orderId) {
      const order = await getOrderById(supportRequest.orderId);
      if (order?.userEmail) fallbackRecipients.add(normalizeEmailLike(order.userEmail));
      if (order?.shipping?.email) fallbackRecipients.add(normalizeEmailLike(order.shipping.email));
    }

    await sendSupportReplyToCustomer(
      { ...supportRequest, _id: undefined },
      id,
      message,
      Array.from(fallbackRecipients),
    );
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Yanıt e-postası gönderilemedi." },
      { status: 500 },
    );
  }

  await appendSupportReply(id, {
    message,
    sentAt: now,
    sentByEmail: guard.user.email,
  });

  return NextResponse.json({ ok: true, sentAt: now });
}
