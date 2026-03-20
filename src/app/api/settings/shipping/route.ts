import { NextResponse } from "next/server";
import { fetchShippingPricingSettings } from "@/lib/db-shipping-settings";

export async function GET() {
  try {
    const settings = await fetchShippingPricingSettings();
    return NextResponse.json(settings);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Kargo ayarı alınamadı.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
