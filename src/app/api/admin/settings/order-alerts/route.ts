import { NextResponse } from "next/server";
import { requireAdminApiAccess } from "@/lib/admin-auth";
import { fetchOrderAlertRecipients, saveOrderAlertRecipients } from "@/lib/db-order-alert-settings";

export async function GET() {
  const guard = await requireAdminApiAccess();
  if (!guard.ok) return guard.response;

  try {
    const recipients = await fetchOrderAlertRecipients();
    return NextResponse.json({ recipients });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Bildirim e-postaları alınamadı.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  const guard = await requireAdminApiAccess();
  if (!guard.ok) return guard.response;

  try {
    const body = (await request.json()) as { recipients?: unknown };
    const recipients = await saveOrderAlertRecipients(body.recipients);
    return NextResponse.json({ recipients });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Bildirim e-postaları kaydedilemedi.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
