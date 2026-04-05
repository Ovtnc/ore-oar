import { NextResponse } from "next/server";
import { validateCoupon, type CouponCartItem } from "@/lib/db-coupons";
import { toSafePrice } from "@/lib/price";

function normalizeCouponItems(input: unknown): CouponCartItem[] {
  if (!Array.isArray(input)) return [];

  return input.reduce<CouponCartItem[]>((acc, entry) => {
    const row = entry as Record<string, unknown> | undefined;
    const productId = String(row?.productId ?? "").trim();
    if (!productId) return acc;

    const quantityRaw = Number(row?.quantity ?? 0);
    const quantity = Number.isFinite(quantityRaw) ? Math.max(1, Math.trunc(quantityRaw)) : 1;
    const price = toSafePrice(row?.price ?? 0);
    const collection = String(row?.collection ?? "").trim() || undefined;

    acc.push({ productId, quantity, price, collection });
    return acc;
  }, []);
}

export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => null)) as {
      code?: string;
      items?: unknown;
    } | null;

    const code = String(body?.code ?? "").trim();
    const items = normalizeCouponItems(body?.items);
    const subtotal = items.reduce((sum, item) => sum + toSafePrice(item.price) * Math.max(1, Math.trunc(item.quantity || 0)), 0);

    if (!code) {
      return NextResponse.json({
        valid: false,
        coupon: null,
        discountAmount: 0,
        eligibleSubtotal: 0,
        message: "Kupon kodu girin.",
      });
    }

    const result = await validateCoupon(code, {
      subtotal,
      items,
    });

    return NextResponse.json({
      ...result,
      subtotal,
      finalSubtotal: Math.max(0, subtotal - result.discountAmount),
    });
  } catch {
    return NextResponse.json(
      {
        valid: false,
        coupon: null,
        discountAmount: 0,
        eligibleSubtotal: 0,
        message: "Kupon doğrulanamadı.",
      },
      { status: 400 },
    );
  }
}
