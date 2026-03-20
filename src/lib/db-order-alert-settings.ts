import { normalizeEmail } from "@/lib/auth";
import { getMongoClient } from "@/lib/mongodb";

const ORDER_ALERT_SETTINGS_DOC_ID = "order-alert-settings";
const ORDER_ALERT_DEFAULT_EMAIL = "okanvatanci@gmail.com";
const MAX_RECIPIENTS = 20;

type OrderAlertSettingsDoc = {
  _id: string;
  recipients?: string[];
  updatedAt?: string;
};

function fallbackRecipients() {
  return Array.from(
    new Set(
      [ORDER_ALERT_DEFAULT_EMAIL, process.env.ADMIN_EMAIL]
        .map((value) => normalizeEmail(String(value ?? "")))
        .filter(Boolean),
    ),
  );
}

function parseRecipients(input: unknown) {
  const raw = Array.isArray(input)
    ? input
    : String(input ?? "")
        .split(/[\n,;]+/)
        .map((item) => item.trim());

  return Array.from(
    new Set(
      raw
        .map((value) => normalizeEmail(String(value ?? "")))
        .filter(Boolean),
    ),
  ).slice(0, MAX_RECIPIENTS);
}

function validateRecipients(emails: string[]) {
  if (emails.length === 0) {
    throw new Error("En az bir bildirim e-postası girin.");
  }

  for (const email of emails) {
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      throw new Error(`Geçersiz e-posta: ${email}`);
    }
  }
}

async function settingsCollection() {
  const client = await getMongoClient();
  return client.db(process.env.MONGODB_DB ?? "oar-ore").collection<OrderAlertSettingsDoc>("settings");
}

export async function fetchOrderAlertRecipients() {
  try {
    const collection = await settingsCollection();
    const doc = await collection.findOne({ _id: ORDER_ALERT_SETTINGS_DOC_ID });
    const parsed = parseRecipients(doc?.recipients ?? []);
    if (parsed.length > 0) return parsed;
    return fallbackRecipients();
  } catch {
    return fallbackRecipients();
  }
}

export async function saveOrderAlertRecipients(input: unknown) {
  const recipients = parseRecipients(input);
  validateRecipients(recipients);

  const collection = await settingsCollection();
  await collection.updateOne(
    { _id: ORDER_ALERT_SETTINGS_DOC_ID },
    {
      $set: {
        recipients,
        updatedAt: new Date().toISOString(),
      },
    },
    { upsert: true },
  );

  return recipients;
}
