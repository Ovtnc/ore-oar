import crypto from "crypto";
import { Prisma } from "@prisma/client";
import { normalizeEmail } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { readSetting } from "@/lib/db-settings";
import { ProductReview, ReviewStatus } from "@/lib/types";

const REVIEWS_SETTINGS_KEY = "product-reviews";
const MAX_REVIEWS = 2000;

type ReviewSeed = {
  id: string;
  userId: string;
  userEmail: string;
  userName: string;
  productId: string;
  rating: number;
  comment: string;
  images: string[];
  status: ReviewStatus;
  createdAt: Date;
  updatedAt: Date;
};

type ReviewRow = {
  id: string;
  userId: string;
  productId: string;
  rating: number;
  comment: string;
  images: string[];
  status: string;
  createdAt: Date;
  updatedAt: Date;
  user: {
    id: string;
    name: string;
    email: string;
  };
  product: {
    id: string;
    slug: string;
    name: string;
  };
};

type LegacyReviewSettings = Array<{
  id?: string;
  productId?: string;
  productSlug?: string;
  productName?: string;
  orderId?: string;
  userId?: string;
  userEmail?: string;
  userName?: string;
  rating?: number;
  title?: string;
  message?: string;
  comment?: string;
  imageUrl?: string;
  images?: string[];
  approved?: boolean;
  status?: string;
  createdAt?: string;
  updatedAt?: string;
}>;

function normalizeText(value: unknown, max = 400) {
  return String(value ?? "").trim().slice(0, max);
}

function normalizeRating(value: unknown) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return 5;
  return Math.min(5, Math.max(1, Math.trunc(parsed)));
}

function normalizeStatus(value: unknown): ReviewStatus {
  const input = String(value ?? "").trim().toLowerCase();
  if (input === "approved" || input === "onaylı") return "approved";
  if (input === "rejected" || input === "reddedilmiş") return "rejected";
  return "pending";
}

function normalizeImageList(input: unknown) {
  const values = Array.isArray(input) ? input : input ? [input] : [];
  return Array.from(
    new Set(
      values
        .map((item) => normalizeText(item, 500))
        .filter(Boolean)
        .slice(0, 6),
    ),
  );
}

function getComment(input: Partial<ProductReview> & Record<string, unknown>) {
  return normalizeText(input.comment ?? input.message ?? input.title ?? "", 2000);
}

function normalizeReviewInput(input: Partial<ProductReview> & Record<string, unknown>): ReviewSeed | null {
  const productId = normalizeText(input.productId, 120);
  const userId = normalizeText(input.userId, 120);
  const userEmail = normalizeEmail(normalizeText(input.userEmail, 180));
  const userName = normalizeText(input.userName, 120);
  const comment = getComment(input);
  const rating = normalizeRating(input.rating);
  const images = normalizeImageList(input.images ?? input.imageUrl);
  const status = normalizeStatus(input.status ?? (input.approved === true ? "approved" : "pending"));

  if (!productId || !userId || !userEmail || !userName || !comment) {
    return null;
  }

  return {
    id: normalizeText(input.id, 80) || crypto.randomUUID(),
    userId,
    userEmail,
    userName,
    productId,
    rating,
    comment,
    images,
    status,
    createdAt: input.createdAt ? new Date(String(input.createdAt)) : new Date(),
    updatedAt: input.updatedAt ? new Date(String(input.updatedAt)) : new Date(),
  };
}

function serializeReview(row: ReviewRow): ProductReview {
  const images = Array.isArray(row.images) ? row.images.filter(Boolean) : [];
  return {
    id: row.id,
    userId: row.userId,
    userEmail: row.user.email,
    userName: row.user.name,
    productId: row.productId,
    productSlug: row.product.slug,
    productName: row.product.name,
    rating: row.rating,
    comment: row.comment,
    images,
    status: normalizeStatus(row.status),
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    approved: row.status === "approved",
    title: row.comment.slice(0, 48),
    message: row.comment,
    imageUrl: images[0],
  };
}

async function syncLegacyReviewsIfNeeded() {
  const count = await prisma.review.count();
  if (count > 0) return;

  const legacy = await readSetting<LegacyReviewSettings | null>(REVIEWS_SETTINGS_KEY, null);
  if (!Array.isArray(legacy) || legacy.length === 0) return;

  const productSlugs = Array.from(
    new Set(legacy.map((item) => normalizeText(item.productSlug, 180)).filter(Boolean)),
  );
  const products = await prisma.product.findMany({
    where: { slug: { in: productSlugs } },
    select: { id: true, slug: true },
  });
  const productMap = new Map(products.map((product) => [product.slug, product.id]));

  const seeded = legacy
    .map((item) => {
      const mappedProductId =
        normalizeText(item.productId, 120) ||
        productMap.get(normalizeText(item.productSlug, 180)) ||
        "";
      const legacyInput = normalizeReviewInput({
        id: item.id,
        productId: mappedProductId,
        userId: item.userId,
        userEmail: item.userEmail,
        userName: item.userName,
        rating: item.rating,
        comment: item.comment ?? item.message ?? item.title,
        images: item.images ?? (item.imageUrl ? [item.imageUrl] : []),
        status: normalizeStatus(item.status ?? (item.approved ? "approved" : "pending")),
        createdAt: item.createdAt,
        updatedAt: item.updatedAt,
      });
      return legacyInput;
    })
    .filter((item): item is ReviewSeed => item !== null);

  if (seeded.length === 0) return;

  await prisma.review.createMany({
    data: seeded.map((item) => ({
      id: item.id,
      userId: item.userId,
      productId: item.productId,
      rating: item.rating,
      comment: item.comment,
      images: item.images,
      status: item.status,
      createdAt: item.createdAt,
      updatedAt: item.updatedAt,
    })),
    skipDuplicates: true,
  });
}

async function readReviews(where?: Prisma.ReviewWhereInput) {
  await syncLegacyReviewsIfNeeded();
  const rows = await prisma.review.findMany({
    where,
    include: {
      user: { select: { id: true, name: true, email: true } },
      product: { select: { id: true, slug: true, name: true } },
    },
    orderBy: [{ createdAt: "desc" }],
    take: MAX_REVIEWS,
  });
  return rows.map((row) => serializeReview(row as ReviewRow));
}

async function saveReviewRow(input: ReviewSeed) {
  const row = await prisma.review.upsert({
    where: { id: input.id },
    update: {
      userId: input.userId,
      productId: input.productId,
      rating: input.rating,
      comment: input.comment,
      images: input.images,
      status: input.status,
      updatedAt: new Date(),
    },
    create: {
      id: input.id,
      userId: input.userId,
      productId: input.productId,
      rating: input.rating,
      comment: input.comment,
      images: input.images,
      status: input.status,
      createdAt: input.createdAt,
      updatedAt: input.updatedAt,
    },
    include: {
      user: { select: { id: true, name: true, email: true } },
      product: { select: { id: true, slug: true, name: true } },
    },
  });
  return serializeReview(row as ReviewRow);
}

export async function fetchReviewsForProduct(slug: string, approvedOnly = true) {
  const normalized = normalizeText(slug, 180);
  return readReviews({
    product: { slug: normalized },
    ...(approvedOnly ? { status: "approved" } : {}),
  });
}

export async function fetchAllReviews() {
  return readReviews();
}

export async function fetchPendingReviewCount() {
  await syncLegacyReviewsIfNeeded();
  return prisma.review.count({ where: { status: "pending" } });
}

export async function createReview(input: {
  productId: string;
  userId: string;
  userEmail: string;
  userName: string;
  rating: number;
  comment: string;
  images?: string[];
}) {
  const review = normalizeReviewInput({
    ...input,
    status: "pending",
    createdAt: new Date().toISOString(),
  });
  if (!review) {
    throw new Error("Geçersiz yorum bilgisi.");
  }

  return saveReviewRow(review);
}

export async function approveReview(reviewId: string) {
  const review = await prisma.review.update({
    where: { id: reviewId },
    data: { status: "approved", updatedAt: new Date() },
    include: {
      user: { select: { id: true, name: true, email: true } },
      product: { select: { id: true, slug: true, name: true } },
    },
  });
  return serializeReview(review as ReviewRow);
}

export async function rejectReview(reviewId: string) {
  const review = await prisma.review.update({
    where: { id: reviewId },
    data: { status: "rejected", updatedAt: new Date() },
    include: {
      user: { select: { id: true, name: true, email: true } },
      product: { select: { id: true, slug: true, name: true } },
    },
  });
  return serializeReview(review as ReviewRow);
}

export async function deleteReview(reviewId: string) {
  await prisma.review.delete({ where: { id: reviewId } });
  return true;
}

export async function bulkModerateReviews(ids: string[], action: "approve" | "reject" | "delete") {
  const normalizedIds = Array.from(
    new Set(ids.map((id) => normalizeText(id, 120)).filter(Boolean)),
  );
  if (normalizedIds.length === 0) return fetchAllReviews();

  if (action === "delete") {
    await prisma.review.deleteMany({ where: { id: { in: normalizedIds } } });
    return fetchAllReviews();
  }

  await prisma.review.updateMany({
    where: { id: { in: normalizedIds } },
    data: { status: action, updatedAt: new Date() },
  });
  return fetchAllReviews();
}

export async function hasUserPurchasedProduct(userId: string, productId: string) {
  const rows = await prisma.order.findMany({
    where: { userId },
    select: { items: true },
  });

  return rows.some((row) => {
    const items = Array.isArray(row.items) ? row.items : [];
    return items.some((item) => {
      const candidate = item as { productId?: unknown };
      return String(candidate.productId ?? "") === productId;
    });
  });
}
