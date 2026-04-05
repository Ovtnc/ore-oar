import { NextResponse } from "next/server";
import { requireAdminApiAccess } from "@/lib/admin-auth";
import { deleteCoupon, fetchCoupons, saveCoupons, upsertCoupon } from "@/lib/db-coupons";

export async function GET() {
  const guard = await requireAdminApiAccess();
  if (!guard.ok) return guard.response;

  const coupons = await fetchCoupons();
  return NextResponse.json({ coupons });
}

export async function PUT(request: Request) {
  const guard = await requireAdminApiAccess();
  if (!guard.ok) return guard.response;

  try {
    const body = (await request.json().catch(() => null)) as { coupons?: unknown } | null;
    const coupons = await saveCoupons(body?.coupons ?? []);
    return NextResponse.json({ coupons });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Kuponlar güncellenemedi.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function POST(request: Request) {
  const guard = await requireAdminApiAccess();
  if (!guard.ok) return guard.response;

  try {
    const body = (await request.json().catch(() => null)) as {
      code?: string;
      discountType?: "percentage" | "fixed";
      discountValue?: number;
      minOrderTotal?: number;
      usageLimit?: number | null;
      validFrom?: string;
      validUntil?: string;
      isActive?: boolean;
    } | null;
    const coupons = await upsertCoupon({
      code: body?.code ?? "",
      discountType: body?.discountType ?? "percentage",
      discountValue: body?.discountValue ?? 0,
      minOrderTotal: body?.minOrderTotal ?? 0,
      usageLimit: body?.usageLimit ?? null,
      validFrom: body?.validFrom ?? "",
      validUntil: body?.validUntil ?? "",
      isActive: body?.isActive !== false,
    });
    return NextResponse.json({ coupons });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Kupon kaydedilemedi.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function DELETE(request: Request) {
  const guard = await requireAdminApiAccess();
  if (!guard.ok) return guard.response;

  try {
    const url = new URL(request.url);
    const code = url.searchParams.get("code") ?? "";
    const coupons = await deleteCoupon(code);
    return NextResponse.json({ coupons });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Kupon silinemedi.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
