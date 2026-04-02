import { readSettingWithTimestamp, writeSetting } from "@/lib/db-settings";

const SHIPPING_SETTINGS_DOC_ID = "shipping-settings";
const DEFAULT_SHIPPING_FEE = 120;
const DEFAULT_FREE_SHIPPING_THRESHOLD = 2500;

export type ShippingPricingSettings = {
  shippingFee: number;
  freeShippingThreshold: number;
  updatedAt?: string;
};

function sanitizeMoney(value: unknown, fallback: number) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) return fallback;
  return Math.round(parsed);
}

function normalizeSettings(input: Partial<ShippingPricingSettings> | null | undefined): ShippingPricingSettings {
  return {
    shippingFee: sanitizeMoney(input?.shippingFee, DEFAULT_SHIPPING_FEE),
    freeShippingThreshold: sanitizeMoney(input?.freeShippingThreshold, DEFAULT_FREE_SHIPPING_THRESHOLD),
    updatedAt: input?.updatedAt,
  };
}

export function defaultShippingPricingSettings(): ShippingPricingSettings {
  const envShippingFee = sanitizeMoney(process.env.NEXT_PUBLIC_SHIPPING_FEE, DEFAULT_SHIPPING_FEE);
  const envFreeThreshold = sanitizeMoney(
    process.env.NEXT_PUBLIC_FREE_SHIPPING_THRESHOLD,
    DEFAULT_FREE_SHIPPING_THRESHOLD,
  );

  return {
    shippingFee: envShippingFee,
    freeShippingThreshold: envFreeThreshold,
  };
}

export async function fetchShippingPricingSettings() {
  const fallback = defaultShippingPricingSettings();
  try {
    const { value, updatedAt } = await readSettingWithTimestamp<ShippingPricingSettings>(
      SHIPPING_SETTINGS_DOC_ID,
      fallback,
    );
    return normalizeSettings({ ...value, updatedAt });
  } catch {
    return fallback;
  }
}

export async function saveShippingPricingSettings(input: Partial<ShippingPricingSettings>) {
  const fallback = defaultShippingPricingSettings();
  const normalized = normalizeSettings({
    shippingFee: input.shippingFee ?? fallback.shippingFee,
    freeShippingThreshold: input.freeShippingThreshold ?? fallback.freeShippingThreshold,
  });

  await writeSetting(SHIPPING_SETTINGS_DOC_ID, {
    shippingFee: normalized.shippingFee,
    freeShippingThreshold: normalized.freeShippingThreshold,
  });

  return {
    ...normalized,
    updatedAt: new Date().toISOString(),
  };
}
