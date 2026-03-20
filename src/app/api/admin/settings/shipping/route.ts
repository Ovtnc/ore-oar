import { NextResponse } from "next/server";
import { requireAdminApiAccess } from "@/lib/admin-auth";
import {
  fetchShippingPricingSettings,
  saveShippingPricingSettings,
  ShippingPricingSettings,
} from "@/lib/db-shipping-settings";

export async function GET() {
  const guard = await requireAdminApiAccess();
  if (!guard.ok) return guard.response;

  try {
    const settings = await fetchShippingPricingSettings();
    return NextResponse.json(settings);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Kargo ayarı alınamadı.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  const guard = await requireAdminApiAccess();
  if (!guard.ok) return guard.response;

  try {
    const body = (await request.json()) as Partial<ShippingPricingSettings>;
    const settings = await saveShippingPricingSettings(body);
    return NextResponse.json(settings);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Kargo ayarı güncellenemedi.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
