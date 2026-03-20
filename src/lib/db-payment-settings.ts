import { getMongoClient } from "@/lib/mongodb";

const PAYMENT_SETTINGS_DOC_ID = "payment-settings";
const DEFAULT_IBAN = "TR00 0000 0000 0000 0000 0000 00";
const MAX_IBAN_COUNT = 20;

export type PaymentIbanEntry = {
  id: string;
  label: string;
  accountHolderName: string;
  iban: string;
  usageCount: number;
  isActive: boolean;
};

type PaymentSettingsDoc = {
  _id: string;
  ibans?: PaymentIbanEntry[];
  updatedAt?: string;
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

async function getSettingsCollection() {
  const client = await getMongoClient();
  return client.db(process.env.MONGODB_DB ?? "oar-ore").collection<PaymentSettingsDoc>("settings");
}

export async function fetchPaymentIbans() {
  try {
    const collection = await getSettingsCollection();
    const doc = await collection.findOne({ _id: PAYMENT_SETTINGS_DOC_ID });
    const parsed = normalizePaymentIbans(doc?.ibans);
    return parsed.length > 0 ? parsed : fallbackPaymentIbans();
  } catch {
    return fallbackPaymentIbans();
  }
}

export async function savePaymentIbans(input: unknown) {
  const ibans = normalizePaymentIbans(input);
  if (ibans.length === 0) {
    throw new Error("En az bir IBAN girmelisiniz.");
  }
  if (!ibans.some((entry) => entry.isActive)) {
    throw new Error("En az bir aktif IBAN olmalıdır.");
  }
  if (ibans.some((entry) => !entry.accountHolderName)) {
    throw new Error("Her IBAN için ad soyad (hesap sahibi) girin.");
  }

  const collection = await getSettingsCollection();
  await collection.updateOne(
    { _id: PAYMENT_SETTINGS_DOC_ID },
    {
      $set: {
        ibans,
        updatedAt: new Date().toISOString(),
      },
    },
    { upsert: true },
  );

  return ibans;
}

function selectIbanByUsagePriority(activeIbans: PaymentIbanEntry[]) {
  const maxUsage = Math.max(...activeIbans.map((entry) => clampUsageCount(entry.usageCount)));
  const weighted = activeIbans.map((entry) => ({
    entry,
    // Az kullanılanı öne çıkaran ağırlık
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
