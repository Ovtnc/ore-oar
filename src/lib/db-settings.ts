import { prisma } from "@/lib/prisma";
import { fromJson, toInputJson, toIsoString } from "@/lib/db-json";

export type AppSettingKey =
  | "homepage-lookbook"
  | "payment-settings"
  | "shipping-settings"
  | "order-alert-settings"
  | "coupon-settings"
  | "newsletter-subscribers"
  | "product-reviews";

export async function readSetting<T>(key: AppSettingKey, fallback: T): Promise<T> {
  const row = await prisma.appSetting.findUnique({ where: { key } });
  return row ? fromJson<T>(row.value, fallback) : fallback;
}

export async function writeSetting<T>(key: AppSettingKey, value: T): Promise<T> {
  const row = await prisma.appSetting.upsert({
    where: { key },
    update: { value: toInputJson(value) },
    create: { key, value: toInputJson(value) },
  });
  return fromJson<T>(row.value, value);
}

export async function readSettingWithTimestamp<T>(key: AppSettingKey, fallback: T) {
  const row = await prisma.appSetting.findUnique({ where: { key } });
  return {
    value: row ? fromJson<T>(row.value, fallback) : fallback,
    updatedAt: toIsoString(row?.updatedAt),
  };
}
