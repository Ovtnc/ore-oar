function parseFromString(input: string) {
  const raw = input.trim();
  if (!raw) return 0;

  const cleaned = raw
    .replace(/[^\d.,-]/g, "")
    .replace(/\.(?=\d{3}(?:\D|$))/g, "")
    .replace(/,(?=\d{3}(?:\D|$))/g, "")
    .replace(",", ".");

  const numeric = Number(cleaned);
  if (!Number.isFinite(numeric)) return 0;
  return Math.max(0, numeric);
}

export function toSafePrice(value: unknown): number {
  if (typeof value === "number") {
    if (!Number.isFinite(value)) return 0;
    return Math.max(0, value);
  }

  if (typeof value === "bigint") {
    const numeric = Number(value);
    if (!Number.isFinite(numeric)) return 0;
    return Math.max(0, numeric);
  }

  if (typeof value === "string") {
    return parseFromString(value);
  }

  if (value && typeof value === "object" && !Array.isArray(value)) {
    const row = value as Record<string, unknown>;
    const candidates = [
      row.$numberDecimal,
      row.$numberDouble,
      row.$numberInt,
      row.$numberLong,
      row.price,
      row.amount,
      row.value,
    ];

    for (const candidate of candidates) {
      if (candidate !== undefined) {
        const parsed = toSafePrice(candidate);
        if (parsed > 0) return parsed;
      }
    }
  }

  return 0;
}
