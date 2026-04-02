import { Prisma } from "@prisma/client";

export function toInputJson(value: unknown): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(value ?? null)) as Prisma.InputJsonValue;
}

export function fromJson<T>(value: Prisma.JsonValue | null | undefined, fallback: T): T {
  if (value === null || typeof value === "undefined") return fallback;
  return value as T;
}

export function toIsoString(value?: Date | string | null) {
  if (!value) return undefined;
  if (typeof value === "string") return value;
  return value.toISOString();
}

export function parseDate(input: unknown): Date | undefined {
  if (!input) return undefined;
  const date = input instanceof Date ? input : new Date(String(input));
  if (Number.isNaN(date.getTime())) return undefined;
  return date;
}
