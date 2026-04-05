import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { readSessionToken, SESSION_COOKIE_NAME } from "@/lib/auth";
import { fetchProductBySlug } from "@/lib/db-products";
import { createReview, fetchReviewsForProduct, hasUserPurchasedProduct } from "@/lib/db-reviews";

function normalizeText(value: unknown, max = 400) {
  return String(value ?? "").trim().slice(0, max);
}

export async function GET(_request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const product = await fetchProductBySlug(slug);
  if (!product) {
    return NextResponse.json({ error: "Ürün bulunamadı." }, { status: 404 });
  }

  const reviews = await fetchReviewsForProduct(slug, true);
  const summary = reviews.reduce(
    (acc, review) => {
      acc.total += 1;
      acc.rating += Number(review.rating || 0);
      return acc;
    },
    { total: 0, rating: 0 },
  );

  return NextResponse.json({
    reviews,
    totalCount: summary.total,
    averageRating: summary.total > 0 ? summary.rating / summary.total : 0,
  });
}

export async function POST(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const token = (await cookies()).get(SESSION_COOKIE_NAME)?.value;
  const sessionUser = readSessionToken(token);
  if (!sessionUser) {
    return NextResponse.json({ error: "Yorum yazmak için giriş yapmalısınız." }, { status: 401 });
  }

  const { slug } = await params;
  const product = await fetchProductBySlug(slug);
  if (!product) {
    return NextResponse.json({ error: "Ürün bulunamadı." }, { status: 404 });
  }

  const body = (await request.json().catch(() => null)) as {
    rating?: number;
    comment?: string;
    message?: string;
    images?: string[];
    imageUrl?: string;
    orderId?: string;
  } | null;

  const orderId = normalizeText(body?.orderId, 120);
  const rating = Number(body?.rating ?? 5);
  const comment = normalizeText(body?.comment ?? body?.message, 2000);
  const images = Array.isArray(body?.images) && body?.images.length > 0
    ? body.images.map((item) => normalizeText(item, 500)).filter(Boolean)
    : normalizeText(body?.imageUrl, 500)
      ? [normalizeText(body?.imageUrl, 500)]
      : [];

  if (!orderId) {
    return NextResponse.json({ error: "Yorum için sipariş numarası gerekli." }, { status: 400 });
  }
  if (!comment || comment.length < 10) {
    return NextResponse.json({ error: "Yorum alanı zorunlu." }, { status: 400 });
  }

  const purchased = await hasUserPurchasedProduct(sessionUser.id, product.id);
  if (!purchased) {
    return NextResponse.json({ error: "Sadece satın alan kullanıcılar yorum yapabilir." }, { status: 403 });
  }

  try {
    const review = await createReview({
      productId: product.id,
      userId: sessionUser.id,
      userEmail: sessionUser.email,
      userName: sessionUser.name,
      rating,
      comment,
      images,
    });
    return NextResponse.json({ ok: true, reviewId: review.id });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Yorum kaydedilemedi.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
