import { readSetting, writeSetting } from "@/lib/db-settings";

const PAYMENT_SETTINGS_DOC_ID = "payment-settings";
const DEFAULT_IBAN = "TR00 0000 0000 0000 0000 0000 00";
const MAX_IBAN_COUNT = 20;
const DEFAULT_WHATSAPP_NUMBER = "905000000000";

export type PaymentIbanEntry = {
  id: string;
  label: string;
  accountHolderName: string;
  iban: string;
  usageCount: number;
  isActive: boolean;
};

type PaymentSettings = {
  ibans: PaymentIbanEntry[];
  whatsappNumber: string;
};

function normalizeIban(input: unknown) {
  return String(input ?? "")
    .trim()
    .toUpperCase()
    .replace(/\s+/g, " ");
}

function validateIban(input: string) {
  const compact = input.replace(/\s+/g, "");
  const validFormat = /^[A-Z]{2}[0-9A-Z]{13,32}$/.test(compact);
  if (!validFormat) {
    throw new Error("Lütfen geçerli bir IBAN girin.");
  }
}

function normalizeLabel(input: unknown, fallback: string) {
  const value = String(input ?? "").trim();
  return value || fallback;
}

function normalizeAccountHolderName(input: unknown) {
  return String(input ?? "")
    .trim()
    .replace(/\s+/g, " ");
}

function normalizeId(input: unknown, fallbackIban: string, index: number) {
  const cleaned = String(input ?? "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, "-")
    .replace(/^-+|-+$/g, "");

  if (cleaned) return cleaned;

  const compact = fallbackIban.replace(/\s+/g, "");
  const suffix = compact.slice(-8).toLowerCase() || String(index + 1);
  return `iban-${suffix}-${index + 1}`;
}

function clampUsageCount(input: unknown) {
  const value = Number(input);
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.trunc(value));
}

function normalizeWhatsappNumber(input: unknown) {
  let value = String(input ?? "")
    .trim()
    .replace(/[^\d+]/g, "");

  if (!value) return "";
  if (value.startsWith("+")) value = value.slice(1);
  value = value.replace(/\D/g, "");

  if (value.startsWith("0")) {
    value = `90${value.slice(1)}`;
  } else if (value.startsWith("5") && value.length === 10) {
    value = `90${value}`;
  }

  return value;
}

function validateWhatsappNumber(input: string) {
  if (!/^\d{10,15}$/.test(input)) {
    throw new Error("WhatsApp numarası 10-15 haneli olmalı.");
  }
}

function fallbackPaymentIbans(): PaymentIbanEntry[] {
  const fallback = normalizeIban(process.env.NEXT_PUBLIC_IBAN ?? DEFAULT_IBAN) || DEFAULT_IBAN;
  return [
    {
      id: "default-iban",
      label: "Varsayılan Hesap",
      accountHolderName: "Hesap Sahibi",
      iban: fallback,
      usageCount: 0,
      isActive: true,
    },
  ];
}

function fallbackWhatsappNumber() {
  const raw = process.env.NEXT_PUBLIC_WHATSAPP_NUMBER ?? process.env.WHATSAPP_ORDER_NUMBER ?? "";
  const normalized = normalizeWhatsappNumber(raw);
  if (normalized) return normalized;
  return DEFAULT_WHATSAPP_NUMBER;
}

function normalizePaymentIbans(input: unknown) {
  const rows = Array.isArray(input) ? input : [];
  const normalized = rows
    .map((raw, index) => {
      const row = raw as Partial<PaymentIbanEntry> | undefined;
      const iban = normalizeIban(row?.iban);
      if (!iban) return null;
      validateIban(iban);

      return {
        id: normalizeId(row?.id, iban, index),
        label: normalizeLabel(row?.label, `Hesap ${index + 1}`),
        accountHolderName:
          normalizeAccountHolderName(row?.accountHolderName) ||
          normalizeLabel(row?.label, `Hesap ${index + 1}`),
        iban,
        usageCount: clampUsageCount(row?.usageCount),
        isActive: row?.isActive !== false,
      } satisfies PaymentIbanEntry;
    })
    .filter((item): item is PaymentIbanEntry => item !== null)
    .slice(0, MAX_IBAN_COUNT);

  const uniqueById = new Map<string, PaymentIbanEntry>();
  for (const entry of normalized) {
    if (!uniqueById.has(entry.id)) {
      uniqueById.set(entry.id, entry);
    }
  }

  return Array.from(uniqueById.values());
}

export async function fetchPaymentSettings(): Promise<PaymentSettings> {
  try {
    const raw = await readSetting<PaymentSettings | null>(PAYMENT_SETTINGS_DOC_ID, null);
    const parsedIbans = normalizePaymentIbans(raw?.ibans);
    const normalizedWhatsappNumber = normalizeWhatsappNumber(raw?.whatsappNumber);
    return {
      ibans: parsedIbans.length > 0 ? parsedIbans : fallbackPaymentIbans(),
      whatsappNumber: normalizedWhatsappNumber || fallbackWhatsappNumber(),
    };
  } catch {
    return {
      ibans: fallbackPaymentIbans(),
      whatsappNumber: fallbackWhatsappNumber(),
    };
  }
}

export async function fetchPaymentIbans() {
  const settings = await fetchPaymentSettings();
  return settings.ibans;
}

export async function savePaymentIbans(input: unknown) {
  const settings = await savePaymentSettings({ ibans: input });
  return settings.ibans;
}

export async function savePaymentSettings(input: {
  ibans?: unknown;
  whatsappNumber?: unknown;
}) {
  const current = await fetchPaymentSettings();
  const ibans =
    typeof input.ibans === "undefined" ? current.ibans : normalizePaymentIbans(input.ibans);
  if (ibans.length === 0) {
    throw new Error("En az bir IBAN girmelisiniz.");
  }
  if (!ibans.some((entry) => entry.isActive)) {
    throw new Error("En az bir aktif IBAN olmalıdır.");
  }
  if (ibans.some((entry) => !entry.accountHolderName)) {
    throw new Error("Her IBAN için ad soyad (hesap sahibi) girin.");
  }

  const whatsappNumber =
    typeof input.whatsappNumber === "undefined"
      ? current.whatsappNumber
      : normalizeWhatsappNumber(input.whatsappNumber);
  if (!whatsappNumber) {
    throw new Error("WhatsApp numarası zorunlu.");
  }
  validateWhatsappNumber(whatsappNumber);

  await writeSetting(PAYMENT_SETTINGS_DOC_ID, { ibans, whatsappNumber });
  return { ibans, whatsappNumber };
}

function selectIbanByUsagePriority(activeIbans: PaymentIbanEntry[]) {
  const maxUsage = Math.max(...activeIbans.map((entry) => clampUsageCount(entry.usageCount)));
  const weighted = activeIbans.map((entry) => ({
    entry,
    weight: maxUsage - clampUsageCount(entry.usageCount) + 1,
  }));

  const totalWeight = weighted.reduce((sum, row) => sum + row.weight, 0);
  let cursor = Math.random() * totalWeight;

  for (const row of weighted) {
    cursor -= row.weight;
    if (cursor <= 0) {
      return row.entry;
    }
  }

  return weighted[weighted.length - 1].entry;
}

export async function assignLeastUsedPriorityRandomIban() {
  const current = await fetchPaymentIbans();
  const active = current.filter((entry) => entry.isActive);
  const pool = active.length > 0 ? active : current;
  const selected = selectIbanByUsagePriority(pool);

  const next = current.map((entry) =>
    entry.id === selected.id
      ? {
          ...entry,
          usageCount: clampUsageCount(entry.usageCount) + 1,
        }
      : entry,
  );

  try {
    await savePaymentIbans(next);
  } catch {
    // Sayaç yazımı başarısız olsa bile sipariş akışı için seçilen IBAN döndürülür.
  }
  return selected;
}

export function fallbackPaymentIbanValue() {
  const entries = fallbackPaymentIbans();
  return entries[0].iban;
}

export async function fetchOrderWhatsappNumber() {
  const settings = await fetchPaymentSettings();
  return settings.whatsappNumber;
}
