import { Prisma, type Order as PrismaOrder } from "@prisma/client";
import { AuthUser, Order, OrderItem, OrderStatus, ShippingInfo } from "@/lib/types";
import { prisma } from "@/lib/prisma";
import { fromJson, parseDate, toInputJson, toIsoString } from "@/lib/db-json";
import { assignLeastUsedPriorityRandomIban } from "@/lib/db-payment-settings";
import {
  calculateCouponDiscount,
  normalizeCouponCode,
  validateCoupon,
} from "@/lib/db-coupons";
import { fetchShippingPricingSettings } from "@/lib/db-shipping-settings";
import { calculateOrderTotalWithConfig } from "@/lib/shipping";
import { toSafePrice } from "@/lib/price";

const EMPTY_SHIPPING: ShippingInfo = {
  fullName: "",
  email: "",
  phone: "",
  address: "",
  city: "",
  postalCode: "",
  country: "",
};

export class StockConflictError extends Error {}
export class CouponValidationError extends Error {}

function toPositiveInt(value: unknown) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return 0;
  return Math.max(0, Math.trunc(parsed));
}

export function normalizeOrderItems(input: unknown) {
  if (!Array.isArray(input)) return [] as OrderItem[];
  const normalized: OrderItem[] = [];
  for (const item of input) {
    const row = item as Partial<OrderItem> | undefined;
    const productId = String(row?.productId ?? "").trim();
    const name = String(row?.name ?? "").trim();
    const quantity = toPositiveInt(row?.quantity);
    if (!productId || !name || quantity <= 0) continue;

    normalized.push({
      productId,
      name,
      quantity,
      price: toSafePrice(row?.price ?? 0),
      collection: row?.collection ? String(row.collection).trim() : undefined,
      coatingOptionId: row?.coatingOptionId ? String(row.coatingOptionId) : undefined,
      coatingName: row?.coatingName ? String(row.coatingName) : undefined,
      coatingPriceDelta: toSafePrice(row?.coatingPriceDelta ?? 0),
    });
  }
  return normalized;
}

export function normalizeCustomerNote(input: unknown) {
  const note = String(input ?? "").trim();
  if (!note) return "";
  return note.slice(0, 400);
}

export function aggregateStockDemand(items: OrderItem[]) {
  const map = new Map<string, number>();
  for (const item of items) {
    const next = (map.get(item.productId) ?? 0) + toPositiveInt(item.quantity);
    map.set(item.productId, next);
  }
  return map;
}

export function calculateItemsSubtotal(items: OrderItem[]) {
  return items.reduce((sum, item) => {
    const unitPrice = toSafePrice(item.price);
    const quantity = toPositiveInt(item.quantity);
    return sum + unitPrice * quantity;
  }, 0);
}

export function serializeOrder(row: PrismaOrder): Order {
  return {
    _id: row.id,
    userId: row.userId ?? undefined,
    userEmail: row.userEmail ?? undefined,
    items: fromJson<OrderItem[]>(row.items, []),
    customerNote: row.customerNote ?? undefined,
    shipping: fromJson<ShippingInfo>(row.shipping, EMPTY_SHIPPING),
    status: row.status as OrderStatus,
    total: row.total,
    subtotal: row.subtotal ?? undefined,
    shippingFee: row.shippingFee ?? undefined,
    couponCode: row.couponCode ?? undefined,
    couponDiscountPercent: row.couponDiscountPercent ?? undefined,
    couponDiscountAmount: row.couponDiscountAmount ?? undefined,
    trackingNumber: row.trackingNumber ?? undefined,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    paymentIban: row.paymentIban ?? undefined,
    paymentIbanId: row.paymentIbanId ?? undefined,
    paymentIbanLabel: row.paymentIbanLabel ?? undefined,
    paymentIbanAccountHolder: row.paymentIbanAccountHolder ?? undefined,
    paymentChatStartedAt: toIsoString(row.paymentChatStartedAt),
    paymentNotifiedAt: toIsoString(row.paymentNotifiedAt),
    paymentVerifiedAt: toIsoString(row.paymentVerifiedAt),
    paymentPaidAmount: row.paymentPaidAmount ?? undefined,
    paymentReceiptUrl: row.paymentReceiptUrl ?? undefined,
    paymentTransactionRef: row.paymentTransactionRef ?? undefined,
    paymentVerificationNote: row.paymentVerificationNote ?? undefined,
    paymentVerificationSource: (row.paymentVerificationSource as Order["paymentVerificationSource"]) ?? undefined,
    paymentVerificationFailedAt: toIsoString(row.paymentVerificationFailedAt),
    lastPaymentReminderAt: toIsoString(row.lastPaymentReminderAt),
    paymentReminderCount: row.paymentReminderCount ?? undefined,
  };
}

export async function listOrdersForUser(userId: string) {
  const rows = await prisma.order.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
  });
  return rows.map(serializeOrder);
}

export async function listAdminOrders() {
  const rows = await prisma.order.findMany({ orderBy: { createdAt: "desc" } });
  return rows.map(serializeOrder);
}

export async function getOrderById(id: string) {
  if (!id.trim()) return null;
  const row = await prisma.order.findUnique({ where: { id } });
  return row ? serializeOrder(row) : null;
}

export async function createOrderForUser(input: {
  user: AuthUser;
  items: OrderItem[];
  shipping: ShippingInfo;
  customerNote?: string;
  couponCode?: string;
}) {
  const selectedPaymentIban = await assignLeastUsedPriorityRandomIban();
  const subtotal = calculateItemsSubtotal(input.items);
  const normalizedCouponCode = normalizeCouponCode(input.couponCode);
  const couponCheck = normalizedCouponCode
    ? await validateCoupon(normalizedCouponCode, {
        subtotal,
        items: input.items,
      })
    : null;
  if (normalizedCouponCode && !couponCheck?.valid) {
    throw new CouponValidationError(couponCheck?.message ?? "Kupon doğrulanamadı.");
  }

  const coupon = couponCheck?.coupon ?? null;
  const couponDiscountAmount = coupon ? calculateCouponDiscount(couponCheck?.eligibleSubtotal ?? subtotal, coupon) : 0;
  const couponDiscountPercent = coupon && coupon.discountType === "percentage" ? coupon.discountValue : null;
  const discountedSubtotal = Math.max(0, subtotal - couponDiscountAmount);
  const shippingSettings = await fetchShippingPricingSettings();
  const totals = calculateOrderTotalWithConfig(discountedSubtotal, shippingSettings);
  const stockDemand = aggregateStockDemand(input.items);

  const created = await prisma.$transaction(async (tx) => {
    for (const [productId, quantity] of stockDemand.entries()) {
      const product = await tx.product.findFirst({
        where: { OR: [{ id: productId }, { slug: productId }] },
        select: { id: true, stock: true },
      });

      if (!product || product.stock < quantity) {
        throw new StockConflictError("Bazı ürünlerde stok yetersiz. Lütfen sepeti güncelleyin.");
      }

      await tx.product.update({
        where: { id: product.id },
        data: { stock: { decrement: quantity } },
      });
    }

    if (coupon) {
      const currentCoupon = await tx.coupon.findUnique({ where: { code: coupon.code } });
      if (
        !currentCoupon ||
        currentCoupon.isActive === false ||
        new Date(currentCoupon.validUntil).getTime() < Date.now() ||
        new Date(currentCoupon.validFrom).getTime() > Date.now() ||
        (currentCoupon.usageLimit != null && currentCoupon.usedCount >= currentCoupon.usageLimit)
      ) {
        throw new CouponValidationError("Bu kupon artık geçerli değil.");
      }
    }

    const order = await tx.order.create({
      data: {
        userId: input.user.id,
        userEmail: input.user.email,
        items: toInputJson(input.items),
        customerNote: input.customerNote || null,
        shipping: toInputJson(input.shipping),
        subtotal: totals.subtotal,
        shippingFee: totals.shippingFee,
        total: totals.grandTotal,
        couponCode: normalizedCouponCode || null,
        couponDiscountPercent: couponDiscountPercent || null,
        couponDiscountAmount: couponDiscountAmount || null,
        status: "Beklemede",
        paymentIban: selectedPaymentIban.iban,
        paymentIbanId: selectedPaymentIban.id,
        paymentIbanLabel: selectedPaymentIban.label,
        paymentIbanAccountHolder: selectedPaymentIban.accountHolderName,
      },
    });

    if (coupon) {
      const updatedCoupon = await tx.coupon.update({
        where: { code: coupon.code },
        data: { usedCount: { increment: 1 } },
      });

      if (updatedCoupon.usageLimit != null && updatedCoupon.usedCount >= updatedCoupon.usageLimit && updatedCoupon.isActive) {
        await tx.coupon.update({
          where: { code: coupon.code },
          data: { isActive: false },
        });
      }

    }

    return order;
  });

  return serializeOrder(created);
}

export async function updateOrderStatus(id: string, status: OrderStatus) {
  const row = await prisma.order.update({
    where: { id },
    data: { status },
  });
  return serializeOrder(row);
}

export async function updateOrderFields(id: string, data: Prisma.OrderUpdateInput) {
  const row = await prisma.order.update({ where: { id }, data });
  return serializeOrder(row);
}

export async function deleteOrderAndRestoreStock(id: string) {
  return prisma.$transaction(async (tx) => {
    const order = await tx.order.findUnique({ where: { id } });
    if (!order) return null;

    const normalized = serializeOrder(order);
    const stockDemand = aggregateStockDemand(normalized.items);

    for (const [productId, quantity] of stockDemand.entries()) {
      const product = await tx.product.findFirst({
        where: { OR: [{ id: productId }, { slug: productId }] },
        select: { id: true },
      });

      if (!product) {
        throw new StockConflictError("Stok iadesi tamamlanamadı. Ürün eşleşmesi kontrol edilmeli.");
      }

      await tx.product.update({
        where: { id: product.id },
        data: { stock: { increment: quantity } },
      });
    }

    if (order.couponCode) {
      const coupon = await tx.coupon.findUnique({ where: { code: normalizeCouponCode(order.couponCode) } });
      if (coupon && coupon.usedCount > 0) {
        await tx.coupon.update({
          where: { code: coupon.code },
          data: { usedCount: { decrement: 1 } },
        });
      }
    }

    await tx.order.delete({ where: { id } });
    return normalized;
  });
}

export async function touchPaymentChatStarted(id: string) {
  const order = await prisma.order.findUnique({ where: { id } });
  if (!order) return null;
  if (order.paymentChatStartedAt) return serializeOrder(order);

  const updated = await prisma.order.update({
    where: { id },
    data: { paymentChatStartedAt: new Date() },
  });
  return serializeOrder(updated);
}

export async function markPaymentNotified(id: string) {
  const order = await prisma.order.findUnique({ where: { id } });
  if (!order) return null;
  if (order.paymentNotifiedAt) return { order: serializeOrder(order), alreadyNotified: true };

  const updated = await prisma.order.update({
    where: { id },
    data: { paymentNotifiedAt: new Date() },
  });
  return { order: serializeOrder(updated), alreadyNotified: false };
}

export async function verifyPayment(id: string, source: "manual" | "n8n", input?: {
  receiptUrl?: string;
  transactionRef?: string;
  note?: string;
  paidAmount?: number | null;
  verifiedAt?: string;
}) {
  const verifiedAt = parseDate(input?.verifiedAt) ?? new Date();
  const updated = await prisma.order.update({
    where: { id },
    data: {
      status: "Ödeme Alındı",
      paymentVerifiedAt: verifiedAt,
      paymentVerificationSource: source,
      paymentReceiptUrl: input?.receiptUrl || undefined,
      paymentTransactionRef: input?.transactionRef || undefined,
      paymentVerificationNote: input?.note || undefined,
      paymentPaidAmount: typeof input?.paidAmount === "number" ? input.paidAmount : undefined,
      paymentNotifiedAt: input?.verifiedAt ? verifiedAt : undefined,
    },
  });
  return serializeOrder(updated);
}
