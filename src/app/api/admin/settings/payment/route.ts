import { NextResponse } from "next/server";
import { requireAdminApiAccess } from "@/lib/admin-auth";
import { fetchPaymentIbans, savePaymentIbans } from "@/lib/db-payment-settings";

export async function GET() {
  const guard = await requireAdminApiAccess();
  if (!guard.ok) return guard.response;

  try {
    const ibans = await fetchPaymentIbans();
    return NextResponse.json({ ibans });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Ödeme ayarı alınamadı.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  const guard = await requireAdminApiAccess();
  if (!guard.ok) return guard.response;

  try {
    const body = (await request.json()) as { ibans?: unknown };
    const ibans = await savePaymentIbans(body.ibans);
    return NextResponse.json({ ibans });
  } catch (err) {
    const message = err instanceof Error ? err.message : "IBAN güncellenemedi.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
