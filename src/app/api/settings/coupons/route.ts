import { NextResponse } from "next/server";
import { validateCoupon } from "@/lib/db-coupons";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code") ?? "";

  if (!code.trim()) {
    return NextResponse.json({ valid: false, coupon: null });
  }

  const result = await validateCoupon(code);
  return NextResponse.json(result);
}

