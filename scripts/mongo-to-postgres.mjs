#!/usr/bin/env node

import { MongoClient } from "mongodb";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

function asString(value) {
  if (value === null || typeof value === "undefined") return "";
  if (typeof value === "string") return value.trim();
  if (typeof value === "object" && value && typeof value.toString === "function") {
    return value.toString().trim();
  }
  return String(value).trim();
}

function asInt(value, fallback = 0) {
  const num = Number(value);
  if (!Number.isFinite(num)) return fallback;
  return Math.round(num);
}

function asNonNegativeInt(value, fallback = 0) {
  return Math.max(0, asInt(value, fallback));
}

function asBool(value, fallback = false) {
  if (typeof value === "boolean") return value;
  if (typeof value === "string") {
    const raw = value.trim().toLowerCase();
    if (raw === "true" || raw === "1") return true;
    if (raw === "false" || raw === "0") return false;
  }
  return fallback;
}

function asDate(value, fallback = new Date()) {
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value;
  const str = asString(value);
  if (!str) return fallback;
  const date = new Date(str);
  if (Number.isNaN(date.getTime())) return fallback;
  return date;
}

function asJson(value, fallback) {
  if (typeof value === "undefined") return fallback;
  try {
    return JSON.parse(JSON.stringify(value));
  } catch {
    return fallback;
  }
}

function slugify(input) {
  return asString(input)
    .toLowerCase()
    .replace(/ğ/g, "g")
    .replace(/ü/g, "u")
    .replace(/ş/g, "s")
    .replace(/ı/g, "i")
    .replace(/ö/g, "o")
    .replace(/ç/g, "c")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function normalizeWhatsappNumber(input) {
  let value = asString(input).replace(/[^\d+]/g, "");
  if (!value) return "";
  if (value.startsWith("+")) value = value.slice(1);
  value = value.replace(/\D/g, "");
  if (value.startsWith("0")) return `90${value.slice(1)}`;
  if (value.startsWith("5") && value.length === 10) return `90${value}`;
  return value;
}

function normalizeEmail(email) {
  return asString(email).toLowerCase();
}

function pickId(doc) {
  return asString(doc?._id) || asString(doc?.id);
}

const MONGO_URI = process.env.MIGRATION_MONGODB_URI || process.env.MONGODB_URI || "";
const MONGO_DB = process.env.MIGRATION_MONGODB_DB || process.env.MONGODB_DB || "oar-ore";
const SHOULD_TRUNCATE = process.env.MIGRATION_TRUNCATE === "1";

const ONLY = new Set(
  asString(process.env.MIGRATION_ONLY)
    .split(",")
    .map((v) => v.trim())
    .filter(Boolean),
);

const RUN_ALL = ONLY.size === 0;

function shouldRun(key) {
  return RUN_ALL || ONLY.has(key);
}

async function migrateUsers(db) {
  const docs = await db.collection("users").find({}).toArray();
  let upserts = 0;
  for (const doc of docs) {
    const id = pickId(doc);
    const email = normalizeEmail(doc.email);
    if (!id || !email) continue;

    await prisma.user.upsert({
      where: { id },
      update: {
        name: asString(doc.name) || "Kullanici",
        email,
        passwordHash: asString(doc.passwordHash),
        createdAt: asDate(doc.createdAt),
        updatedAt: asDate(doc.updatedAt, asDate(doc.createdAt)),
      },
      create: {
        id,
        name: asString(doc.name) || "Kullanici",
        email,
        passwordHash: asString(doc.passwordHash),
        createdAt: asDate(doc.createdAt),
        updatedAt: asDate(doc.updatedAt, asDate(doc.createdAt)),
      },
    });
    upserts += 1;
  }
  return { source: docs.length, upserts };
}

async function migrateProducts(db) {
  const docs = await db.collection("products").find({}).toArray();
  let upserts = 0;

  for (const doc of docs) {
    const id = asString(doc.id) || asString(doc.slug) || pickId(doc);
    const slug = asString(doc.slug) || slugify(doc.name || id);
    if (!id || !slug) continue;

    const imagesRaw = Array.isArray(doc.images)
      ? doc.images
      : asString(doc.image)
      ? [asString(doc.image)]
      : [];

    await prisma.product.upsert({
      where: { slug },
      update: {
        id,
        slug,
        name: asString(doc.name) || slug,
        category: asString(doc.category) || "Kolye",
        description: asString(doc.description),
        price: asInt(doc.price, 0),
        material: asString(doc.material),
        image: asString(doc.image) || imagesRaw[0] || "/file.svg",
        images: imagesRaw.map((x) => asString(x)).filter(Boolean),
        collection: asString(doc.collection) || "Atelier 01",
        finish: asString(doc.finish) || "Ayna polisaj",
        stock: asNonNegativeInt(doc.stock, 0),
        leadTimeDays: asNonNegativeInt(doc.leadTimeDays, 3),
        tags: Array.isArray(doc.tags) ? doc.tags.map((x) => asString(x)).filter(Boolean) : [],
        coatingOptions: asJson(doc.coatingOptions, []),
        isNew: asBool(doc.isNew, false),
        isLimited: asBool(doc.isLimited, false),
        createdAt: asDate(doc.createdAt),
        updatedAt: asDate(doc.updatedAt, asDate(doc.createdAt)),
      },
      create: {
        id,
        slug,
        name: asString(doc.name) || slug,
        category: asString(doc.category) || "Kolye",
        description: asString(doc.description),
        price: asInt(doc.price, 0),
        material: asString(doc.material),
        image: asString(doc.image) || imagesRaw[0] || "/file.svg",
        images: imagesRaw.map((x) => asString(x)).filter(Boolean),
        collection: asString(doc.collection) || "Atelier 01",
        finish: asString(doc.finish) || "Ayna polisaj",
        stock: asNonNegativeInt(doc.stock, 0),
        leadTimeDays: asNonNegativeInt(doc.leadTimeDays, 3),
        tags: Array.isArray(doc.tags) ? doc.tags.map((x) => asString(x)).filter(Boolean) : [],
        coatingOptions: asJson(doc.coatingOptions, []),
        isNew: asBool(doc.isNew, false),
        isLimited: asBool(doc.isLimited, false),
        createdAt: asDate(doc.createdAt),
        updatedAt: asDate(doc.updatedAt, asDate(doc.createdAt)),
      },
    });

    upserts += 1;
  }

  return { source: docs.length, upserts };
}

async function migrateOrders(db) {
  const docs = await db.collection("orders").find({}).toArray();
  const userIds = new Set((await prisma.user.findMany({ select: { id: true } })).map((u) => u.id));
  let upserts = 0;

  for (const doc of docs) {
    const id = pickId(doc);
    if (!id) continue;

    const userIdRaw = asString(doc.userId);
    const userId = userIds.has(userIdRaw) ? userIdRaw : null;

    await prisma.order.upsert({
      where: { id },
      update: {
        userId,
        userEmail: normalizeEmail(doc.userEmail) || null,
        items: asJson(doc.items, []),
        customerNote: asString(doc.customerNote) || null,
        shipping: asJson(doc.shipping, {}),
        status: asString(doc.status) || "Beklemede",
        total: asInt(doc.total, 0),
        subtotal: typeof doc.subtotal === "undefined" ? null : asInt(doc.subtotal, 0),
        shippingFee: typeof doc.shippingFee === "undefined" ? null : asInt(doc.shippingFee, 0),
        createdAt: asDate(doc.createdAt),
        updatedAt: asDate(doc.updatedAt, asDate(doc.createdAt)),
        paymentIban: asString(doc.paymentIban) || null,
        paymentIbanId: asString(doc.paymentIbanId) || null,
        paymentIbanLabel: asString(doc.paymentIbanLabel) || null,
        paymentIbanAccountHolder: asString(doc.paymentIbanAccountHolder) || null,
        paymentChatStartedAt: doc.paymentChatStartedAt ? asDate(doc.paymentChatStartedAt) : null,
        paymentNotifiedAt: doc.paymentNotifiedAt ? asDate(doc.paymentNotifiedAt) : null,
        paymentVerifiedAt: doc.paymentVerifiedAt ? asDate(doc.paymentVerifiedAt) : null,
        paymentPaidAmount: typeof doc.paymentPaidAmount === "undefined" ? null : asInt(doc.paymentPaidAmount, 0),
        paymentReceiptUrl: asString(doc.paymentReceiptUrl) || null,
        paymentTransactionRef: asString(doc.paymentTransactionRef) || null,
        paymentVerificationNote: asString(doc.paymentVerificationNote) || null,
        paymentVerificationSource: asString(doc.paymentVerificationSource) || null,
        paymentVerificationFailedAt: doc.paymentVerificationFailedAt ? asDate(doc.paymentVerificationFailedAt) : null,
        lastPaymentReminderAt: doc.lastPaymentReminderAt ? asDate(doc.lastPaymentReminderAt) : null,
        paymentReminderCount: asNonNegativeInt(doc.paymentReminderCount, 0),
      },
      create: {
        id,
        userId,
        userEmail: normalizeEmail(doc.userEmail) || null,
        items: asJson(doc.items, []),
        customerNote: asString(doc.customerNote) || null,
        shipping: asJson(doc.shipping, {}),
        status: asString(doc.status) || "Beklemede",
        total: asInt(doc.total, 0),
        subtotal: typeof doc.subtotal === "undefined" ? null : asInt(doc.subtotal, 0),
        shippingFee: typeof doc.shippingFee === "undefined" ? null : asInt(doc.shippingFee, 0),
        createdAt: asDate(doc.createdAt),
        updatedAt: asDate(doc.updatedAt, asDate(doc.createdAt)),
        paymentIban: asString(doc.paymentIban) || null,
        paymentIbanId: asString(doc.paymentIbanId) || null,
        paymentIbanLabel: asString(doc.paymentIbanLabel) || null,
        paymentIbanAccountHolder: asString(doc.paymentIbanAccountHolder) || null,
        paymentChatStartedAt: doc.paymentChatStartedAt ? asDate(doc.paymentChatStartedAt) : null,
        paymentNotifiedAt: doc.paymentNotifiedAt ? asDate(doc.paymentNotifiedAt) : null,
        paymentVerifiedAt: doc.paymentVerifiedAt ? asDate(doc.paymentVerifiedAt) : null,
        paymentPaidAmount: typeof doc.paymentPaidAmount === "undefined" ? null : asInt(doc.paymentPaidAmount, 0),
        paymentReceiptUrl: asString(doc.paymentReceiptUrl) || null,
        paymentTransactionRef: asString(doc.paymentTransactionRef) || null,
        paymentVerificationNote: asString(doc.paymentVerificationNote) || null,
        paymentVerificationSource: asString(doc.paymentVerificationSource) || null,
        paymentVerificationFailedAt: doc.paymentVerificationFailedAt ? asDate(doc.paymentVerificationFailedAt) : null,
        lastPaymentReminderAt: doc.lastPaymentReminderAt ? asDate(doc.lastPaymentReminderAt) : null,
        paymentReminderCount: asNonNegativeInt(doc.paymentReminderCount, 0),
      },
    });

    upserts += 1;
  }

  return { source: docs.length, upserts };
}

async function migrateSupportRequests(db) {
  const docs = await db.collection("support_requests").find({}).toArray();
  let upserts = 0;

  for (const doc of docs) {
    const id = pickId(doc);
    if (!id) continue;

    await prisma.supportRequest.upsert({
      where: { id },
      update: {
        orderId: asString(doc.orderId),
        userId: asString(doc.userId),
        userEmail: normalizeEmail(doc.userEmail),
        userName: asString(doc.userName),
        productId: asString(doc.productId),
        productName: asString(doc.productName),
        productVariant: asString(doc.productVariant) || null,
        subject: asString(doc.subject),
        message: asString(doc.message),
        replies: asJson(doc.replies, []),
        lastReplyAt: doc.lastReplyAt ? asDate(doc.lastReplyAt) : null,
        replyCount: asNonNegativeInt(doc.replyCount, 0),
        status: asString(doc.status) || "Yeni",
        createdAt: asDate(doc.createdAt),
        updatedAt: asDate(doc.updatedAt, asDate(doc.createdAt)),
      },
      create: {
        id,
        orderId: asString(doc.orderId),
        userId: asString(doc.userId),
        userEmail: normalizeEmail(doc.userEmail),
        userName: asString(doc.userName),
        productId: asString(doc.productId),
        productName: asString(doc.productName),
        productVariant: asString(doc.productVariant) || null,
        subject: asString(doc.subject),
        message: asString(doc.message),
        replies: asJson(doc.replies, []),
        lastReplyAt: doc.lastReplyAt ? asDate(doc.lastReplyAt) : null,
        replyCount: asNonNegativeInt(doc.replyCount, 0),
        status: asString(doc.status) || "Yeni",
        createdAt: asDate(doc.createdAt),
        updatedAt: asDate(doc.updatedAt, asDate(doc.createdAt)),
      },
    });

    upserts += 1;
  }

  return { source: docs.length, upserts };
}

function normalizeSettingValue(key, doc) {
  if (key === "homepage-lookbook") {
    return Array.isArray(doc.slugs) ? doc.slugs.map((x) => asString(x)).filter(Boolean) : [];
  }

  if (key === "order-alert-settings") {
    return Array.isArray(doc.recipients)
      ? doc.recipients.map((x) => normalizeEmail(x)).filter(Boolean)
      : [];
  }

  if (key === "shipping-settings") {
    return {
      shippingFee: asNonNegativeInt(doc.shippingFee, 120),
      freeShippingThreshold: asNonNegativeInt(doc.freeShippingThreshold, 2500),
    };
  }

  if (key === "payment-settings") {
    return {
      ibans: Array.isArray(doc.ibans) ? asJson(doc.ibans, []) : [],
      whatsappNumber: normalizeWhatsappNumber(doc.whatsappNumber),
    };
  }

  const copy = { ...doc };
  delete copy._id;
  delete copy.updatedAt;
  return asJson(copy, {});
}

async function migrateSettings(db) {
  const docs = await db.collection("settings").find({}).toArray();
  let upserts = 0;

  for (const doc of docs) {
    const key = pickId(doc);
    if (!key) continue;

    await prisma.appSetting.upsert({
      where: { key },
      update: {
        value: asJson(normalizeSettingValue(key, doc), {}),
        updatedAt: asDate(doc.updatedAt),
      },
      create: {
        key,
        value: asJson(normalizeSettingValue(key, doc), {}),
        updatedAt: asDate(doc.updatedAt),
      },
    });
    upserts += 1;
  }

  return { source: docs.length, upserts };
}

async function truncateTables() {
  await prisma.$transaction([
    prisma.order.deleteMany(),
    prisma.supportRequest.deleteMany(),
    prisma.product.deleteMany(),
    prisma.user.deleteMany(),
    prisma.appSetting.deleteMany(),
  ]);
}

async function main() {
  if (!MONGO_URI) {
    throw new Error("MIGRATION_MONGODB_URI (veya MONGODB_URI) zorunlu.");
  }
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL zorunlu.");
  }

  const mongo = new MongoClient(MONGO_URI);
  await mongo.connect();

  const db = mongo.db(MONGO_DB);
  const report = {};

  try {
    if (SHOULD_TRUNCATE) {
      console.log("[truncate] PostgreSQL tablolari temizleniyor...");
      await truncateTables();
    }

    if (shouldRun("users")) {
      report.users = await migrateUsers(db);
      console.log("[users]", report.users);
    }

    if (shouldRun("products")) {
      report.products = await migrateProducts(db);
      console.log("[products]", report.products);
    }

    if (shouldRun("orders")) {
      report.orders = await migrateOrders(db);
      console.log("[orders]", report.orders);
    }

    if (shouldRun("support_requests")) {
      report.support_requests = await migrateSupportRequests(db);
      console.log("[support_requests]", report.support_requests);
    }

    if (shouldRun("settings")) {
      report.settings = await migrateSettings(db);
      console.log("[settings]", report.settings);
    }

    console.log("\nMigration tamamlandi.");
    console.table(report);
  } finally {
    await mongo.close();
    await prisma.$disconnect();
  }
}

main().catch(async (err) => {
  console.error("\nMigration hatasi:", err?.message ?? err);
  await prisma.$disconnect();
  process.exit(1);
});
