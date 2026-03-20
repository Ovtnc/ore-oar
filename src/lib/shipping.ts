import { toSafePrice } from "@/lib/price";

const DEFAULT_SHIPPING_FEE = 120;
const DEFAULT_FREE_SHIPPING_THRESHOLD = 2500;

function readEnvNumber(key: string, fallback: number) {
  const raw = process.env[key];
  if (!raw) return fallback;
  const parsed = Number(raw);
  if (!Number.isFinite(parsed) || parsed < 0) return fallback;
  return parsed;
}

export const SHIPPING_FEE = readEnvNumber("NEXT_PUBLIC_SHIPPING_FEE", DEFAULT_SHIPPING_FEE);
export const FREE_SHIPPING_THRESHOLD = readEnvNumber(
  "NEXT_PUBLIC_FREE_SHIPPING_THRESHOLD",
  DEFAULT_FREE_SHIPPING_THRESHOLD,
);

export type ShippingFeeConfig = {
  shippingFee: number;
  freeShippingThreshold: number;
};

function resolveConfig(config?: Partial<ShippingFeeConfig>): ShippingFeeConfig {
  const shippingFee = Number(config?.shippingFee);
  const freeShippingThreshold = Number(config?.freeShippingThreshold);

  return {
    shippingFee: Number.isFinite(shippingFee) && shippingFee >= 0 ? shippingFee : SHIPPING_FEE,
    freeShippingThreshold:
      Number.isFinite(freeShippingThreshold) && freeShippingThreshold >= 0
        ? freeShippingThreshold
        : FREE_SHIPPING_THRESHOLD,
  };
}

export function calculateShippingFee(subtotal: unknown) {
  return calculateShippingFeeWithConfig(subtotal);
}

export function calculateShippingFeeWithConfig(subtotal: unknown, config?: Partial<ShippingFeeConfig>) {
  const resolved = resolveConfig(config);
  const safeSubtotal = toSafePrice(subtotal);
  return safeSubtotal >= resolved.freeShippingThreshold ? 0 : resolved.shippingFee;
}

export function calculateOrderTotal(subtotal: unknown) {
  return calculateOrderTotalWithConfig(subtotal);
}

export function calculateOrderTotalWithConfig(subtotal: unknown, config?: Partial<ShippingFeeConfig>) {
  const resolved = resolveConfig(config);
  const safeSubtotal = toSafePrice(subtotal);
  const shippingFee = calculateShippingFeeWithConfig(safeSubtotal, resolved);
  return {
    subtotal: safeSubtotal,
    shippingFee,
    grandTotal: safeSubtotal + shippingFee,
    hasFreeShipping: shippingFee === 0,
    freeShippingThreshold: resolved.freeShippingThreshold,
  };
}
