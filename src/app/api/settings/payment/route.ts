import { NextResponse } from "next/server";
import { fallbackPaymentIbanValue, fetchPaymentIbans } from "@/lib/db-payment-settings";

export async function GET() {
  try {
    const ibans = await fetchPaymentIbans();
    const iban = ibans[0]?.iban ?? fallbackPaymentIbanValue();
    return NextResponse.json({ iban });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Ödeme bilgisi alınamadı.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
