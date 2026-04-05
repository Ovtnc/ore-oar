import { normalizeEmail } from "@/lib/auth";
import { readSetting, writeSetting } from "@/lib/db-settings";
import { NewsletterSubscriber } from "@/lib/types";

const NEWSLETTER_SETTINGS_KEY = "newsletter-subscribers";
const MAX_SUBSCRIBERS = 5000;

async function readSubscribers() {
  const settings = await readSetting<NewsletterSubscriber[] | null>(NEWSLETTER_SETTINGS_KEY, null);
  return Array.isArray(settings) ? settings : [];
}

export async function fetchNewsletterSubscribers() {
  const subscribers = await readSubscribers();
  return subscribers
    .map((item) => ({
      email: normalizeEmail(String(item?.email ?? "")),
      createdAt: String(item?.createdAt ?? new Date().toISOString()),
    }))
    .filter((item) => item.email);
}

export async function subscribeNewsletter(email: string) {
  const normalized = normalizeEmail(email);
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)) {
    throw new Error("Geçerli bir e-posta girin.");
  }

  const current = await fetchNewsletterSubscribers();
  if (current.some((item) => item.email === normalized)) {
    return { added: false, subscribers: current };
  }

  const next = [{ email: normalized, createdAt: new Date().toISOString() }, ...current].slice(0, MAX_SUBSCRIBERS);
  await writeSetting(NEWSLETTER_SETTINGS_KEY, next);
  return { added: true, subscribers: next };
}
