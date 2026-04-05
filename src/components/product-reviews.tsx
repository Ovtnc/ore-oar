"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/components/auth-provider";
import { Order, ProductReview } from "@/lib/types";

type ProductReviewsProps = {
  productId: string;
  productSlug: string;
  productName: string;
};

function Stars({ value }: { value: number }) {
  return (
    <div className="flex items-center gap-1 text-[#D4AF37]">
      {Array.from({ length: 5 }).map((_, index) => (
        <span key={index} className={index < value ? "text-[#D4AF37]" : "text-zinc-700"}>
          ★
        </span>
      ))}
    </div>
  );
}

function Avatar({ name }: { name: string }) {
  const initial = name.trim().slice(0, 1).toUpperCase() || "O";
  return (
    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-[#D4AF37]/25 bg-black/30 text-sm font-semibold text-[#F3D47B]">
      {initial}
    </div>
  );
}

function VerifiedBadge() {
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-[#D4AF37]/22 bg-[#D4AF37]/8 px-2.5 py-1 text-[10px] tracking-[0.14em] text-[#F3D47B]">
      ✓ Doğrulanmış Alıcı
    </span>
  );
}

function normalizeImageList(images: string[]) {
  return Array.from(new Set((images ?? []).filter(Boolean))).slice(0, 3);
}

export function ProductReviews({ productId, productSlug, productName }: ProductReviewsProps) {
  const { isAuthenticated, user } = useAuth();
  const [reviews, setReviews] = useState<ProductReview[]>([]);
  const [loading, setLoading] = useState(true);
  const [orders, setOrders] = useState<Order[]>([]);
  const [selectedOrderId, setSelectedOrderId] = useState("");
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [photoFiles, setPhotoFiles] = useState<File[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [showComposer, setShowComposer] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const eligibleOrders = useMemo(
    () => orders.filter((order) => (order.items ?? []).some((item) => item.productId === productId)),
    [orders, productId],
  );

  const summary = useMemo(() => {
    const count = reviews.length;
    const avg = count > 0 ? reviews.reduce((sum, review) => sum + review.rating, 0) / count : 0;
    return {
      count,
      average: avg,
      text: count > 0 ? avg.toFixed(1) : "0.0",
      ratio: Math.max(0, Math.min(100, (avg / 5) * 100)),
    };
  }, [reviews]);

  useEffect(() => {
    let mounted = true;
    async function load() {
      setLoading(true);
      try {
        const reviewsRes = await fetch(`/api/products/${productSlug}/reviews`, { cache: "no-store" });
        const reviewData = reviewsRes.ok ? await reviewsRes.json().catch(() => null) : null;
        let ordersData: Order[] = [];
        if (isAuthenticated) {
          const ordersRes = await fetch("/api/orders", { cache: "no-store" });
          if (ordersRes.ok) {
            ordersData = (await ordersRes.json().catch(() => [])) as Order[];
          }
        }

        if (!mounted) return;
        setReviews(Array.isArray(reviewData?.reviews) ? (reviewData.reviews as ProductReview[]) : []);
        setOrders(Array.isArray(ordersData) ? ordersData : []);
      } catch {
        if (!mounted) return;
      } finally {
        if (!mounted) return;
        setLoading(false);
      }
    }

    void load();
    return () => {
      mounted = false;
    };
  }, [isAuthenticated, productSlug]);

  useEffect(() => {
    if (eligibleOrders.length === 0) return;
    if (selectedOrderId) return;
    setSelectedOrderId(String(eligibleOrders[0]._id ?? ""));
  }, [eligibleOrders, selectedOrderId]);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(null), 3500);
    return () => window.clearTimeout(timer);
  }, [toast]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSuccess(null);

    if (!isAuthenticated) {
      setError("Yorum yazmak için giriş yapmalısın.");
      return;
    }
    if (!selectedOrderId) {
      setError("Bu ürün için uygun sipariş bulunamadı.");
      return;
    }
    if (comment.trim().length < 10) {
      setError("Yorum en az 10 karakter olmalı.");
      return;
    }

    setSubmitting(true);
    try {
      const images: string[] = [];
      for (const file of photoFiles.slice(0, 3)) {
        const fd = new FormData();
        fd.append("file", file);
        const uploadRes = await fetch("/api/uploads/review", { method: "POST", body: fd });
        const uploadData = (await uploadRes.json().catch(() => null)) as { url?: string; error?: string } | null;
        if (!uploadRes.ok || !uploadData?.url) {
          throw new Error(uploadData?.error ?? "Fotoğraf yüklenemedi.");
        }
        images.push(uploadData.url);
      }

      const response = await fetch(`/api/products/${productSlug}/reviews`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderId: selectedOrderId,
          rating,
          comment,
          images,
        }),
      });
      const data = (await response.json().catch(() => null)) as { error?: string; reviewId?: string } | null;
      if (!response.ok) {
        throw new Error(data?.error ?? "Yorum gönderilemedi.");
      }

      setSuccess("Yorumunuz alındı, editör onayından sonra yayınlanacaktır.");
      setToast("Yorumunuz alındı, editör onayından sonra yayınlanacaktır.");
      setComment("");
      setPhotoFiles([]);
      setShowComposer(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Yorum gönderilemedi.");
    } finally {
      setSubmitting(false);
    }
  }

  const canReview = isAuthenticated && eligibleOrders.length > 0;

  return (
    <section className="mx-auto w-full max-w-4xl rounded-2xl border border-zinc-800/75 bg-zinc-950/30 p-5 md:p-6">
      <div className="rounded-2xl border border-zinc-800/75 bg-black/18 p-4 md:p-5">
        <p className="text-xs tracking-[0.24em] text-[#D4AF37]">MÜŞTERİ YORUMLARI</p>
        <div className="mt-3 grid gap-4 lg:grid-cols-[1fr_auto] lg:items-end">
          <div>
            <h2 className="text-2xl font-semibold text-zinc-100">
              {productName}
              <span className="mt-1 block text-sm font-normal text-zinc-500">Satın alanların deneyimleri</span>
            </h2>
            <div className="mt-3 h-2 overflow-hidden rounded-full bg-zinc-800">
              <div className="h-full rounded-full bg-gradient-to-r from-[#D4AF37] via-[#F3D47B] to-[#D4AF37]" style={{ width: `${summary.ratio}%` }} />
            </div>
            <p className="mt-2 text-sm text-zinc-500">
              Ortalama puan: <span className="text-[#F3D47B]">{summary.text}/5</span> • {summary.count} yorum
            </p>
          </div>
          <div className="flex items-end gap-4">
            <div>
              <p className="text-5xl font-semibold text-[#D4AF37]">{summary.text}</p>
              <p className="mt-1 text-sm text-zinc-500">/ 5</p>
            </div>
            <div className="pb-1">
              <Stars value={Math.max(0, Math.round(summary.average))} />
              <p className="mt-2 text-xs tracking-[0.16em] text-zinc-500">{summary.count} onaylı yorum</p>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-5 space-y-3">
        {loading ? (
          <div className="rounded-xl border border-zinc-800/75 bg-black/18 p-4 text-zinc-300">Yorumlar yükleniyor...</div>
        ) : reviews.length === 0 ? (
          <div className="rounded-xl border border-zinc-800/75 bg-black/18 p-4 text-zinc-400">
            Henüz onaylı yorum yok. İlk deneyimi sen paylaşabilirsin.
          </div>
        ) : (
          reviews.map((review) => {
            const reviewImages = normalizeImageList(review.images ?? []);
            return (
              <article key={review.id} className="rounded-xl border border-zinc-800/75 bg-black/18 p-4">
                <div className="flex gap-3">
                  <Avatar name={review.userName} />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-zinc-100">{review.userName}</p>
                        <p className="truncate text-xs text-zinc-500">{review.productName}</p>
                      </div>
                      <Stars value={review.rating} />
                    </div>
                    <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-zinc-500">
                      <span>{new Date(review.createdAt).toLocaleDateString("tr-TR")}</span>
                      <span className="text-zinc-700">•</span>
                      <VerifiedBadge />
                    </div>
                    <p className="mt-3 text-sm leading-relaxed text-zinc-300">{review.comment}</p>
                    {reviewImages.length > 0 && (
                      <div className="mt-4 flex gap-2 overflow-x-auto pb-1">
                        {reviewImages.map((image, index) => (
                          <div key={`${review.id}-${index}`} className="relative h-20 w-20 shrink-0 overflow-hidden rounded-xl border border-zinc-800/75">
                            <Image src={image} alt={review.comment} fill className="object-cover" />
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </article>
            );
          })
        )}
      </div>

      <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
        {canReview ? (
          <button
            type="button"
            onClick={() => setShowComposer(true)}
            className="rounded-full border border-[#D4AF37]/35 bg-black/25 px-5 py-2.5 text-sm font-medium text-[#D4AF37] transition-all duration-500 ease-in-out hover:bg-[#D4AF37]/10 hover:shadow-[0_0_20px_rgba(212,175,55,0.16)]"
          >
            Sen de Yorum Yap
          </button>
        ) : isAuthenticated ? (
          <p className="rounded-full border border-zinc-800 bg-black/25 px-5 py-2 text-sm text-zinc-500">
            Yorum yapabilmek için bu ürünü satın almış olmalısın.
          </p>
        ) : (
          <p className="rounded-full border border-zinc-800 bg-black/25 px-5 py-2 text-sm text-zinc-500">
            Yorum yapabilmek için giriş yapmalısın.
          </p>
        )}
      </div>

      {success && <p className="mt-3 text-center text-sm text-emerald-100">{success}</p>}

      {showComposer && canReview && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-3 backdrop-blur-md md:items-center md:p-6">
          <div className="relative w-full max-w-2xl rounded-3xl border border-zinc-800/80 bg-zinc-950/95 p-5 shadow-[0_22px_80px_rgba(0,0,0,0.55)]">
            <button
              type="button"
              onClick={() => setShowComposer(false)}
              className="absolute right-4 top-4 rounded-full border border-zinc-800 px-3 py-1 text-xs text-zinc-400 transition hover:border-[#D4AF37]/40 hover:text-[#F3D47B]"
            >
              Kapat
            </button>

            <p className="text-xs tracking-[0.22em] text-[#D4AF37]">YORUM EKLE</p>
            <h3 className="mt-2 text-xl font-semibold text-zinc-100">Deneyimini paylaş</h3>
            <p className="mt-2 text-sm text-zinc-400">Yorumun editör onayından sonra yayınlanır.</p>

            <form onSubmit={handleSubmit} className="mt-5 space-y-4">
              <p className="rounded-lg border border-[#D4AF37]/15 bg-black/30 px-3 py-2 text-sm text-zinc-300">
                Giriş yapan hesap: <span className="text-[#F3D47B]">{user?.email}</span>
              </p>

              <label className="block text-sm">
                <span className="mb-1 block text-zinc-300">Sipariş No</span>
                <select
                  value={selectedOrderId}
                  onChange={(e) => setSelectedOrderId(e.target.value)}
                  className="w-full rounded-lg border border-zinc-800 bg-black/40 px-3 py-2 text-zinc-100 outline-none focus:border-[#D4AF37]"
                >
                  <option value="">Sipariş seç</option>
                  {eligibleOrders.map((order) => (
                    <option key={String(order._id)} value={String(order._id)}>
                      #{String(order._id)} - {new Date(order.createdAt).toLocaleDateString("tr-TR")}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block text-sm">
                <span className="mb-1 block text-zinc-300">Puan</span>
                <div className="grid grid-cols-5 gap-2">
                  {[5, 4, 3, 2, 1].map((value) => {
                    const active = rating === value;
                    return (
                      <button
                        key={value}
                        type="button"
                        onClick={() => setRating(value)}
                        className={`rounded-xl border px-3 py-2 text-sm transition-all duration-500 ease-in-out ${
                          active
                            ? "border-[#D4AF37]/55 bg-[#D4AF37]/10 text-[#F3D47B]"
                            : "border-zinc-800 bg-black/35 text-zinc-400 hover:border-[#D4AF37]/35"
                        }`}
                      >
                        {value} ★
                      </button>
                    );
                  })}
                </div>
              </label>

              <label className="block text-sm">
                <span className="mb-1 block text-zinc-300">Yorum</span>
                <textarea
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  rows={5}
                  className="w-full rounded-lg border border-zinc-800 bg-black/40 px-3 py-2 text-zinc-100 outline-none focus:border-[#D4AF37]"
                  placeholder="Ürünün dokusu, işçiliği ve kullanım hissi hakkında yaz."
                />
              </label>

              <label className="block text-sm">
                <span className="mb-1 block text-zinc-300">Fotoğraf(lar)</span>
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={(e) => setPhotoFiles(Array.from(e.target.files ?? []).slice(0, 3))}
                  className="w-full rounded-lg border border-zinc-800 bg-black/40 px-3 py-2 text-sm text-zinc-300 outline-none file:mr-3 file:rounded-lg file:border-0 file:bg-[#D4AF37] file:px-3 file:py-2 file:text-black"
                />
              </label>

              {error && <div className="rounded-lg border border-red-400/30 bg-red-950/20 p-3 text-sm text-red-200">{error}</div>}

              <button
                type="submit"
                disabled={submitting}
                className="w-full rounded-2xl border border-[#D4AF37] bg-[#D4AF37] px-4 py-3 text-sm font-semibold text-black transition-all duration-500 ease-in-out disabled:cursor-not-allowed disabled:opacity-45"
              >
                {submitting ? "Gönderiliyor..." : "Yorumu Gönder"}
              </button>
            </form>
          </div>
        </div>
      )}

      {toast && (
        <div className="fixed bottom-4 right-4 z-[60] max-w-sm rounded-2xl border border-[#D4AF37]/35 bg-zinc-950/95 px-4 py-3 text-sm text-zinc-100 shadow-[0_20px_60px_rgba(0,0,0,0.45)]">
          {toast}
        </div>
      )}
    </section>
  );
}
