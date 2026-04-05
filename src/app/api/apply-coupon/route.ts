import { NextResponse } from "next/server";
import { normalizeOrderItems, calculateItemsSubtotal } from "@/lib/db-orders";
import { validateCoupon } from "@/lib/db-coupons";

export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => null)) as {
      code?: string;
      items?: unknown;
    } | null;

    const code = String(body?.code ?? "").trim();
    const items = normalizeOrderItems(body?.items);
    const subtotal = calculateItemsSubtotal(items);

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
      items: items.map((item) => ({
        productId: item.productId,
        quantity: item.quantity,
        price: item.price,
        collection: item.collection,
      })),
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
