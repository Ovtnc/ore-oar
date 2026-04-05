import { prisma } from "@/lib/prisma";
import { toSafePrice } from "@/lib/price";
import { readSetting } from "@/lib/db-settings";
import { Coupon, CouponDiscountType } from "@/lib/types";

const COUPON_SETTINGS_KEY = "coupon-settings";
const MAX_COUPONS = 200;
const COLLECTIONS = new Set(["Atelier 01", "Monolith", "Arc Form", "Forge"]);

type PrismaCouponRow = {
  id: string;
  code: string;
  discountType: string;
  discountValue: number;
  minOrderTotal: number;
  usageLimit: number | null;
  usedCount: number;
  validFrom: Date;
  validUntil: Date;
  collectionRestriction: string | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
};

export type CouponCartItem = {
  productId: string;
  quantity: number;
  price: number;
  collection?: string;
};

export type CouponValidationResult =
  | {
      valid: true;
      coupon: Coupon;
      discountAmount: number;
      eligibleSubtotal: number;
      message: string;
    }
  | {
      valid: false;
      coupon: null;
      discountAmount: 0;
      eligibleSubtotal: number;
      message: string;
    };

function normalizeCode(input: unknown) {
  return String(input ?? "")
    .trim()
    .toUpperCase()
    .replace(/\s+/g, "");
}

function normalizeDiscountType(input: unknown): CouponDiscountType {
  const value = String(input ?? "").trim().toLowerCase();
  return value === "fixed" || value === "tutar" || value === "tl" ? "fixed" : "percentage";
}

function normalizeAmount(input: unknown) {
  const value = Number(input);
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.trunc(value));
}

function normalizeOptionalAmount(input: unknown) {
  const value = Number(input);
  if (!Number.isFinite(value)) return null;
  return Math.max(0, Math.trunc(value));
}

function normalizeDate(input: unknown) {
  const raw = String(input ?? "").trim();
  if (!raw) return "";
  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) return "";
  return parsed.toISOString();
}

function normalizeCollectionRestriction(input: unknown) {
  const value = String(input ?? "").trim();
  if (!value) return null;
  if (COLLECTIONS.has(value)) return value;
  return value;
}

function normalizeCouponRecord(input: unknown): Coupon | null {
  const row = input as Record<string, unknown> | undefined;
  const code = normalizeCode(row?.code);
  if (!code) return null;

  const discountType = normalizeDiscountType(row?.discountType ?? (row?.discountPercent != null ? "percentage" : "fixed"));
  const discountValue = normalizeAmount(row?.discountValue ?? row?.discountPercent ?? 0);
  const minOrderTotal = normalizeAmount(row?.minOrderTotal ?? 0);
  const usageLimit = normalizeOptionalAmount(row?.usageLimit);
  const usedCount = normalizeAmount(row?.usedCount ?? 0);
  const validFrom = normalizeDate(row?.validFrom ?? row?.createdAt ?? new Date(0).toISOString()) || new Date(0).toISOString();
  const validUntil = normalizeDate(row?.validUntil ?? row?.expiresAt ?? new Date().toISOString()) || new Date().toISOString();
  const collectionRestriction = normalizeCollectionRestriction(row?.collectionRestriction ?? row?.collection ?? null);
  const isActive = row?.isActive !== false;
  const createdAt = normalizeDate(row?.createdAt ?? validFrom) || new Date().toISOString();
  const updatedAt = normalizeDate(row?.updatedAt ?? new Date().toISOString()) || new Date().toISOString();

  return {
    id: typeof row?.id === "string" ? row.id : undefined,
    code,
    discountType,
    discountValue,
    minOrderTotal,
    usageLimit,
    usedCount,
    validFrom,
    validUntil,
    collectionRestriction,
    isActive,
    createdAt,
    updatedAt,
  };
}

function serializeCoupon(row: PrismaCouponRow): Coupon {
  return {
    id: row.id,
    code: row.code,
    discountType: row.discountType as CouponDiscountType,
    discountValue: row.discountValue,
    minOrderTotal: row.minOrderTotal,
    usageLimit: row.usageLimit ?? null,
    usedCount: row.usedCount,
    validFrom: row.validFrom.toISOString(),
    validUntil: row.validUntil.toISOString(),
    collectionRestriction: row.collectionRestriction ?? null,
    isActive: row.isActive,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

function getStatus(coupon: Coupon) {
  const now = Date.now();
  const validFrom = new Date(coupon.validFrom).getTime();
  const validUntil = new Date(coupon.validUntil).getTime();
  if (Number.isNaN(validFrom) || Number.isNaN(validUntil) || validUntil < now) {
    return "Süresi Dolmuş" as const;
  }
  if (coupon.isActive === false) {
    return "Pasif" as const;
  }
  if (coupon.usageLimit != null && coupon.usedCount >= coupon.usageLimit) {
    return "Pasif" as const;
  }
  if (validFrom > now) {
    return "Pasif" as const;
  }
  return "Aktif" as const;
}

async function syncLegacyCouponsIfNeeded() {
  const count = await prisma.coupon.count();
  if (count > 0) return;

  const legacy = await readSetting<{ coupons?: unknown[] } | null>(COUPON_SETTINGS_KEY, null);
  const legacyRows = Array.isArray(legacy?.coupons) ? legacy.coupons : [];
  if (legacyRows.length === 0) return;

  for (const row of legacyRows) {
    const coupon = normalizeCouponRecord(row);
    if (!coupon) continue;

    await prisma.coupon.upsert({
      where: { code: coupon.code },
      update: {
        discountType: coupon.discountType,
        discountValue: coupon.discountValue,
        minOrderTotal: coupon.minOrderTotal,
        usageLimit: coupon.usageLimit,
        usedCount: coupon.usedCount,
        validFrom: new Date(coupon.validFrom),
        validUntil: new Date(coupon.validUntil),
        collectionRestriction: coupon.collectionRestriction,
        isActive: coupon.isActive,
      },
      create: {
        code: coupon.code,
        discountType: coupon.discountType,
        discountValue: coupon.discountValue,
        minOrderTotal: coupon.minOrderTotal,
        usageLimit: coupon.usageLimit,
        usedCount: coupon.usedCount,
        validFrom: new Date(coupon.validFrom),
        validUntil: new Date(coupon.validUntil),
        collectionRestriction: coupon.collectionRestriction,
        isActive: coupon.isActive,
      },
    });
  }
}

async function syncExpiredCoupons() {
  const rows = await prisma.coupon.findMany({
    select: { code: true, validUntil: true, isActive: true, usageLimit: true, usedCount: true },
  });
  const now = Date.now();
  const toDeactivate = rows
    .filter((row) => {
      const expired = row.validUntil.getTime() < now;
      const exhausted = row.usageLimit != null && row.usedCount >= row.usageLimit;
      return row.isActive && (expired || exhausted);
    })
    .map((row) => row.code);

  if (toDeactivate.length === 0) return;

  await prisma.coupon.updateMany({
    where: { code: { in: toDeactivate } },
    data: { isActive: false },
  });
}

async function readCouponsFromDatabase() {
  await syncLegacyCouponsIfNeeded();
  await syncExpiredCoupons();

  const rows = await prisma.coupon.findMany({ orderBy: [{ createdAt: "desc" }, { updatedAt: "desc" }] });
  return rows.map(serializeCoupon);
}

async function findCouponRow(code: string) {
  const normalized = normalizeCode(code);
  if (!normalized) return null;
  await syncLegacyCouponsIfNeeded();
  const row = await prisma.coupon.findUnique({ where: { code: normalized } });
  return row;
}

async function calculateEligibleSubtotal(items: CouponCartItem[], coupon: Coupon) {
  const subtotal = items.reduce((sum, item) => sum + toSafePrice(item.price) * Math.max(1, Math.trunc(item.quantity || 0)), 0);
  if (!coupon.collectionRestriction) {
    return subtotal;
  }

  const productIds = Array.from(new Set(items.map((item) => String(item.productId ?? "").trim()).filter(Boolean)));
  const collectionMap = new Map<string, string>();
  if (productIds.length > 0) {
    const products = await prisma.product.findMany({
      where: { id: { in: productIds } },
      select: { id: true, collection: true },
    });
    products.forEach((product) => {
      collectionMap.set(product.id, product.collection);
    });
  }

  return items.reduce((sum, item) => {
    const collection = String(item.collection ?? "").trim() || collectionMap.get(String(item.productId ?? "").trim()) || "";
    if (collection && collection === coupon.collectionRestriction) {
      return sum + toSafePrice(item.price) * Math.max(1, Math.trunc(item.quantity || 0));
    }
    return sum;
  }, 0);
}

export async function fetchCoupons() {
  return readCouponsFromDatabase();
}

export async function saveCoupons(input: unknown) {
  const rows = Array.isArray(input) ? input : [];
  const normalized = rows.map(normalizeCouponRecord).filter((item): item is Coupon => item !== null);
  if (normalized.some((coupon) => coupon.discountValue <= 0)) {
    throw new Error("İndirim miktarı 0 olamaz.");
  }
  const unique = Array.from(new Map(normalized.map((item) => [item.code, item])).values()).slice(0, MAX_COUPONS);

  for (const coupon of unique) {
    await prisma.coupon.upsert({
      where: { code: coupon.code },
      update: {
        discountType: coupon.discountType,
        discountValue: coupon.discountValue,
        minOrderTotal: coupon.minOrderTotal,
        usageLimit: coupon.usageLimit ?? null,
        validFrom: new Date(coupon.validFrom),
        validUntil: new Date(coupon.validUntil),
        collectionRestriction: coupon.collectionRestriction ?? null,
        isActive: coupon.isActive !== false,
      },
      create: {
        code: coupon.code,
        discountType: coupon.discountType,
        discountValue: coupon.discountValue,
        minOrderTotal: coupon.minOrderTotal,
        usageLimit: coupon.usageLimit ?? null,
        validFrom: new Date(coupon.validFrom),
        validUntil: new Date(coupon.validUntil),
        collectionRestriction: coupon.collectionRestriction ?? null,
        isActive: coupon.isActive !== false,
      },
    });
  }

  return fetchCoupons();
}

export async function upsertCoupon(input: Partial<Coupon>) {
  const code = normalizeCode(input.code);
  if (!code) {
    throw new Error("Geçerli kupon kodu girin.");
  }

  const existing = await findCouponRow(code);
  const next = normalizeCouponRecord({
    ...existing,
    ...input,
    code,
    usedCount: existing?.usedCount ?? input.usedCount ?? 0,
    createdAt: existing?.createdAt ?? input.createdAt ?? new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });

  if (!next) {
    throw new Error("Geçerli kupon bilgisi girin.");
  }
  if (next.discountValue <= 0) {
    throw new Error("İndirim miktarı 0 olamaz.");
  }

  await prisma.coupon.upsert({
    where: { code },
    update: {
      discountType: next.discountType,
      discountValue: next.discountValue,
      minOrderTotal: next.minOrderTotal,
      usageLimit: next.usageLimit ?? null,
      validFrom: new Date(next.validFrom),
      validUntil: new Date(next.validUntil),
      collectionRestriction: next.collectionRestriction ?? null,
      isActive: next.isActive !== false,
    },
    create: {
      code: next.code,
      discountType: next.discountType,
      discountValue: next.discountValue,
      minOrderTotal: next.minOrderTotal,
      usageLimit: next.usageLimit ?? null,
      usedCount: next.usedCount,
      validFrom: new Date(next.validFrom),
      validUntil: new Date(next.validUntil),
      collectionRestriction: next.collectionRestriction ?? null,
      isActive: next.isActive !== false,
    },
  });

  return fetchCoupons();
}

export async function deleteCoupon(code: string) {
  const normalized = normalizeCode(code);
  if (!normalized) return fetchCoupons();
  await prisma.coupon.deleteMany({ where: { code: normalized } });
  return fetchCoupons();
}

export async function validateCoupon(code: string, context?: { subtotal?: number; items?: CouponCartItem[] }): Promise<CouponValidationResult> {
  const normalized = normalizeCode(code);
  if (!normalized) {
    return {
      valid: false,
      coupon: null,
      discountAmount: 0,
      eligibleSubtotal: 0,
      message: "Kupon kodu girin.",
    };
  }

  await syncExpiredCoupons();
  const row = await findCouponRow(normalized);
  if (!row) {
    return {
      valid: false,
      coupon: null,
      discountAmount: 0,
      eligibleSubtotal: 0,
      message: "Geçersiz kupon kodu.",
    };
  }

  const coupon = serializeCoupon(row);
  const now = Date.now();
  const validFrom = new Date(coupon.validFrom).getTime();
  const validUntil = new Date(coupon.validUntil).getTime();

  if (Number.isNaN(validFrom) || Number.isNaN(validUntil) || validUntil < now) {
    await prisma.coupon.updateMany({ where: { code: coupon.code }, data: { isActive: false } });
    return {
      valid: false,
      coupon: null,
      discountAmount: 0,
      eligibleSubtotal: 0,
      message: "Bu kuponun süresi dolmuş.",
    };
  }

  if (coupon.isActive === false) {
    if (validFrom > now) {
      return {
        valid: false,
        coupon: null,
        discountAmount: 0,
        eligibleSubtotal: 0,
        message: "Bu kupon henüz aktif değil.",
      };
    }
    if (coupon.usageLimit != null && coupon.usedCount >= coupon.usageLimit) {
      return {
        valid: false,
        coupon: null,
        discountAmount: 0,
        eligibleSubtotal: 0,
        message: "Bu kupon kullanım limitine ulaştı.",
      };
    }
    return {
      valid: false,
      coupon: null,
      discountAmount: 0,
      eligibleSubtotal: 0,
      message: "Bu kupon pasif durumda.",
    };
  }

  if (validFrom > now) {
    return {
      valid: false,
      coupon: null,
      discountAmount: 0,
      eligibleSubtotal: 0,
      message: "Bu kupon henüz aktif değil.",
    };
  }

  if (coupon.usageLimit != null && coupon.usedCount >= coupon.usageLimit) {
    await prisma.coupon.updateMany({ where: { code: coupon.code }, data: { isActive: false } });
    return {
      valid: false,
      coupon: null,
      discountAmount: 0,
      eligibleSubtotal: 0,
      message: "Bu kupon kullanım limitine ulaştı.",
    };
  }

  const subtotal = Math.max(0, Math.trunc(Number(context?.subtotal ?? 0)));
  if (coupon.minOrderTotal > 0 && subtotal < coupon.minOrderTotal) {
    return {
      valid: false,
      coupon: null,
      discountAmount: 0,
      eligibleSubtotal: 0,
      message: `Minimum ${coupon.minOrderTotal.toLocaleString("tr-TR")} TL üzeri alışverişlerde geçerlidir.`,
    };
  }

  const eligibleSubtotal = await calculateEligibleSubtotal(context?.items ?? [], coupon);
  if (coupon.collectionRestriction && eligibleSubtotal <= 0) {
    return {
      valid: false,
      coupon: null,
      discountAmount: 0,
      eligibleSubtotal: 0,
      message: `Bu kupon yalnızca ${coupon.collectionRestriction} koleksiyonunda geçerlidir.`,
    };
  }

  if (coupon.discountValue <= 0) {
    return {
      valid: false,
      coupon: null,
      discountAmount: 0,
      eligibleSubtotal,
      message: "Bu kupon için indirim miktarı tanımlı değil.",
    };
  }

  const discountAmount = calculateCouponDiscount(eligibleSubtotal, coupon);
  if (discountAmount <= 0) {
    return {
      valid: false,
      coupon: null,
      discountAmount: 0,
      eligibleSubtotal,
      message: "Bu kupon bu sepet için indirim üretmiyor. Sepet toplamını ve koleksiyon kısıtını kontrol et.",
    };
  }

  const label = coupon.discountType === "percentage" ? `%${coupon.discountValue}` : `${coupon.discountValue.toLocaleString("tr-TR")} TL`;
  return {
    valid: true,
    coupon,
    discountAmount,
    eligibleSubtotal,
    message: `Uygulanan Kupon: ${coupon.code} (${label})`,
  };
}

export function calculateCouponDiscount(subtotal: number, coupon: Coupon | null | undefined) {
  if (!coupon) return 0;
  const basis = Math.max(0, Math.trunc(Number(subtotal ?? 0)));
  const value = Math.max(0, Math.trunc(Number(coupon.discountValue ?? 0)));

  if (coupon.discountType === "fixed") {
    return Math.min(basis, value);
  }

  return Math.round((basis * value) / 100);
}

export async function recordCouponUsage(code?: string | null) {
  const normalized = normalizeCode(code);
  if (!normalized) return null;

  return prisma.$transaction(async (tx) => {
    const current = await tx.coupon.findUnique({ where: { code: normalized } });
    if (!current) return null;

    const updated = await tx.coupon.update({
      where: { code: normalized },
      data: { usedCount: { increment: 1 } },
    });

    if (updated.usageLimit != null && updated.usedCount >= updated.usageLimit && updated.isActive) {
      const deactivated = await tx.coupon.update({
        where: { code: normalized },
        data: { isActive: false },
      });
      return serializeCoupon(deactivated);
    }

    return serializeCoupon(updated);
  });
}

export async function revertCouponUsage(code?: string | null) {
  const normalized = normalizeCode(code);
  if (!normalized) return null;

  return prisma.$transaction(async (tx) => {
    const current = await tx.coupon.findUnique({ where: { code: normalized } });
    if (!current) return null;

    const updated = await tx.coupon.update({
      where: { code: normalized },
      data: { usedCount: { decrement: 1 } },
    });

    return serializeCoupon(updated);
  });
}

export function normalizeCouponCode(input: unknown) {
  return normalizeCode(input);
}

export function formatCouponDate(input?: string) {
  if (!input) return "";
  const parsed = new Date(input);
  if (Number.isNaN(parsed.getTime())) return "";
  return parsed.toLocaleDateString("tr-TR");
}

export function couponStatusLabel(coupon: Coupon) {
  return getStatus(coupon);
}
