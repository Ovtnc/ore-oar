"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ProductReview, ReviewStatus } from "@/lib/types";

type ReviewFilter = "pending" | "approved" | "rejected" | "all";

const FILTERS: Array<{ key: ReviewFilter; label: string }> = [
  { key: "pending", label: "Onay Bekleyenler" },
  { key: "approved", label: "Onaylanmış" },
  { key: "rejected", label: "Reddedilmiş" },
  { key: "all", label: "Tüm Yorumlar" },
];

function statusMeta(status: ReviewStatus) {
  if (status === "approved") return { label: "Onaylı", className: "border-emerald-400/30 bg-emerald-500/10 text-emerald-200" };
  if (status === "rejected") return { label: "Reddedildi", className: "border-red-400/30 bg-red-500/10 text-red-200" };
  return { label: "Bekliyor", className: "border-amber-400/30 bg-amber-500/10 text-amber-100" };
}

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
    <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-[#D4AF37]/25 bg-black/30 text-sm font-semibold text-[#F3D47B]">
      {initial}
    </div>
  );
}

function normalizeImageList(images: string[]) {
  return Array.from(new Set(images.filter(Boolean))).slice(0, 3);
}

export default function AdminReviewsPage() {
  const [reviews, setReviews] = useState<ProductReview[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [filter, setFilter] = useState<ReviewFilter>("pending");
  const [processing, setProcessing] = useState<string | null>(null);

  const loadReviews = async () => {
    try {
      const response = await fetch("/api/admin/reviews", { cache: "no-store" });
      const data = (await response.json().catch(() => null)) as { reviews?: ProductReview[]; error?: string } | null;
      if (!response.ok) throw new Error(data?.error ?? "Yorumlar yüklenemedi.");
      setReviews(Array.isArray(data?.reviews) ? data!.reviews : []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Yorumlar yüklenemedi.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadReviews();
  }, []);

  const stats = useMemo(() => {
    const pending = reviews.filter((review) => review.status === "pending").length;
    const approved = reviews.filter((review) => review.status === "approved").length;
    const rejected = reviews.filter((review) => review.status === "rejected").length;
    return { total: reviews.length, pending, approved, rejected };
  }, [reviews]);

  const filteredReviews = useMemo(() => {
    if (filter === "all") return reviews;
    return reviews.filter((review) => review.status === filter);
  }, [filter, reviews]);

  const pendingReviews = useMemo(
    () => reviews.filter((review) => review.status === "pending").slice(0, 6),
    [reviews],
  );

  const selectedCount = selectedIds.length;

  async function mutateReviews(ids: string[], action: "approve" | "reject" | "delete") {
    if (ids.length === 0) return;
    setProcessing(action);
    setError(null);
    try {
      const response = await fetch("/api/admin/reviews", {
        method: action === "delete" ? "DELETE" : "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids, action }),
      });
      const data = (await response.json().catch(() => null)) as { reviews?: ProductReview[]; error?: string } | null;
      if (!response.ok) throw new Error(data?.error ?? "İşlem başarısız.");
      await loadReviews();
      setSelectedIds([]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "İşlem başarısız.");
    } finally {
      setProcessing(null);
    }
  }

  function toggleSelected(id: string) {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]));
  }

  const fieldClass =
    "rounded-full border border-[#D4AF37]/25 bg-black/25 px-4 py-2 text-xs uppercase tracking-[0.18em] text-zinc-300 transition-all duration-500 ease-in-out hover:border-[#D4AF37]/45 hover:text-[#F3D47B]";

  return (
    <section className="mx-auto w-full max-w-7xl px-4 py-10 md:px-8">
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs tracking-[0.24em] text-[#D4AF37]">MODERATION</p>
          <h1 className="mt-2 text-3xl font-semibold text-zinc-100">Müşteri Yorumları</h1>
          <p className="mt-2 max-w-2xl text-sm text-zinc-400">
            Onay bekleyen yorumları en üste al, hızlıca denetle ve premium deneyimi koru.
          </p>
        </div>
        <Link
          href="/admin/panel"
          className="rounded-xl border border-[#D4AF37]/35 px-4 py-2 text-sm text-[#D4AF37] transition hover:bg-[#D4AF37]/10"
        >
          Panoya Dön
        </Link>
      </div>

      {error && (
        <div className="mb-4 rounded-2xl border border-red-400/30 bg-red-950/20 p-4 text-sm text-red-200">
          {error}
        </div>
      )}

      <div className="mb-6 grid gap-4 md:grid-cols-4">
        <div className="rounded-2xl border border-zinc-800/75 bg-zinc-900/55 p-4">
          <p className="text-xs tracking-[0.18em] text-zinc-400">TOPLAM</p>
          <p className="mt-2 text-3xl font-semibold text-zinc-100">{stats.total}</p>
        </div>
        <div className="rounded-2xl border border-amber-400/25 bg-amber-500/10 p-4">
          <p className="text-xs tracking-[0.18em] text-amber-100">ONAY BEKLEYEN</p>
          <p className="mt-2 text-3xl font-semibold text-amber-100">{stats.pending}</p>
        </div>
        <div className="rounded-2xl border border-emerald-400/25 bg-emerald-500/10 p-4">
          <p className="text-xs tracking-[0.18em] text-emerald-100">ONAYLANAN</p>
          <p className="mt-2 text-3xl font-semibold text-emerald-100">{stats.approved}</p>
        </div>
        <div className="rounded-2xl border border-red-400/25 bg-red-500/10 p-4">
          <p className="text-xs tracking-[0.18em] text-red-100">REDDEDİLEN</p>
          <p className="mt-2 text-3xl font-semibold text-red-100">{stats.rejected}</p>
        </div>
      </div>

      <div className="rounded-3xl border border-zinc-800/75 bg-zinc-950/35 p-5">
        <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-xs tracking-[0.24em] text-[#D4AF37]">ONAY BEKLEYENLER</p>
            <h2 className="mt-2 text-2xl font-semibold text-zinc-100">Hızlı Aksiyon Listesi</h2>
          </div>
          {pendingReviews.length > 0 && (
            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={() => void mutateReviews(pendingReviews.map((review) => review.id), "approve")} className={fieldClass} disabled={processing !== null}>
                Tümünü Onayla
              </button>
              <button type="button" onClick={() => void mutateReviews(pendingReviews.map((review) => review.id), "delete")} className={fieldClass} disabled={processing !== null}>
                Tümünü Sil
              </button>
            </div>
          )}
        </div>

        {loading ? (
          <div className="rounded-2xl border border-zinc-800/75 bg-black/20 p-5 text-zinc-300">Yükleniyor...</div>
        ) : pendingReviews.length === 0 ? (
          <div className="rounded-2xl border border-zinc-800/75 bg-black/20 p-5 text-zinc-400">Bekleyen yorum yok.</div>
        ) : (
          <div className="grid gap-3 lg:grid-cols-2">
            {pendingReviews.map((review) => (
              <article key={review.id} className="rounded-2xl border border-amber-400/20 bg-black/20 p-4">
                <div className="flex items-start gap-3">
                  <input
                    type="checkbox"
                    checked={selectedIds.includes(review.id)}
                    onChange={() => toggleSelected(review.id)}
                    className="mt-1 h-4 w-4 accent-[#D4AF37]"
                  />
                  <Avatar name={review.userName} />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-zinc-100">{review.userName}</p>
                        <p className="truncate text-xs text-zinc-500">{review.productName}</p>
                      </div>
                      <span className="rounded-full border border-amber-400/25 bg-amber-500/10 px-2.5 py-1 text-[11px] tracking-[0.14em] text-amber-100">
                        ONAY BEKLİYOR
                      </span>
                    </div>
                    <div className="mt-2 flex items-center gap-3">
                      <Stars value={review.rating} />
                      <span className={`rounded-full border px-2.5 py-1 text-[11px] ${statusMeta(review.status).className}`}>
                        {statusMeta(review.status).label}
                      </span>
                    </div>
                    <p className="mt-3 text-sm leading-relaxed text-zinc-300">{review.comment}</p>
                    {normalizeImageList(review.images).length > 0 && (
                      <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
                        {normalizeImageList(review.images).map((image, index) => (
                          <div key={`${review.id}-${index}`} className="relative h-20 w-20 shrink-0 overflow-hidden rounded-xl border border-zinc-800/75">
                            <Image src={image} alt={review.productName ?? review.comment} fill className="object-cover" />
                          </div>
                        ))}
                      </div>
                    )}
                    <div className="mt-4 flex flex-wrap gap-2">
                      <button
                        type="button"
                        disabled={processing !== null}
                        onClick={() => void mutateReviews([review.id], "approve")}
                        className="rounded-xl border border-emerald-400/35 px-4 py-2 text-sm text-emerald-200 transition hover:bg-emerald-500/10 disabled:opacity-45"
                      >
                        Onayla
                      </button>
                      <button
                        type="button"
                        disabled={processing !== null}
                        onClick={() => void mutateReviews([review.id], "reject")}
                        className="rounded-xl border border-red-400/35 px-4 py-2 text-sm text-red-200 transition hover:bg-red-500/10 disabled:opacity-45"
                      >
                        Reddet
                      </button>
                      <button
                        type="button"
                        disabled={processing !== null}
                        onClick={() => void mutateReviews([review.id], "delete")}
                        className="rounded-xl border border-[#D4AF37]/30 px-4 py-2 text-sm text-[#D4AF37] transition hover:bg-[#D4AF37]/10 disabled:opacity-45"
                      >
                        Sil
                      </button>
                    </div>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>

      <div className="mt-6 rounded-3xl border border-zinc-800/75 bg-zinc-950/35 p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap gap-2">
            {FILTERS.map((item) => (
              <button
                key={item.key}
                type="button"
                onClick={() => setFilter(item.key)}
                className={`rounded-full border px-4 py-2 text-xs uppercase tracking-[0.18em] transition-all duration-500 ease-in-out ${
                  filter === item.key
                    ? "border-[#D4AF37]/45 bg-[#D4AF37]/10 text-[#F3D47B]"
                    : "border-zinc-800/75 bg-black/18 text-zinc-400 hover:border-[#D4AF37]/35 hover:text-zinc-200"
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>

          <div className="flex flex-wrap gap-2">
            {selectedCount > 0 && (
              <>
                <button
                  type="button"
                  onClick={() => void mutateReviews(selectedIds, "approve")}
                  className="rounded-xl border border-emerald-400/35 px-4 py-2 text-sm text-emerald-200 transition hover:bg-emerald-500/10"
                >
                  Seçilenleri Onayla ({selectedCount})
                </button>
                <button
                  type="button"
                  onClick={() => void mutateReviews(selectedIds, "delete")}
                  className="rounded-xl border border-red-400/35 px-4 py-2 text-sm text-red-200 transition hover:bg-red-500/10"
                >
                  Seçilenleri Sil ({selectedCount})
                </button>
              </>
            )}
          </div>
        </div>

        <div className="mt-5">
          <div className="mb-4 flex items-center justify-between">
            <p className="text-xs tracking-[0.2em] uppercase text-[#D4AF37]">
              {FILTERS.find((item) => item.key === filter)?.label ?? "Yorumlar"}
            </p>
            <p className="text-xs text-zinc-500">{filteredReviews.length} kayıt</p>
          </div>

          {filteredReviews.length === 0 ? (
            <div className="rounded-2xl border border-zinc-800/75 bg-black/20 p-5 text-zinc-400">Bu filtre için kayıt yok.</div>
          ) : (
            <div className="space-y-3">
              {filteredReviews.map((review) => {
                const meta = statusMeta(review.status);
                return (
                  <article key={review.id} className="rounded-2xl border border-zinc-800/75 bg-black/20 p-4">
                    <div className="flex items-start gap-3">
                      <input
                        type="checkbox"
                        checked={selectedIds.includes(review.id)}
                        onChange={() => toggleSelected(review.id)}
                        className="mt-1 h-4 w-4 accent-[#D4AF37]"
                      />
                      <Avatar name={review.userName} />
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div className="min-w-0">
                            <p className="truncate text-sm font-semibold text-zinc-100">{review.userName}</p>
                            <p className="truncate text-xs text-zinc-500">{review.productName}</p>
                          </div>
                          <span className={`rounded-full border px-2.5 py-1 text-[11px] ${meta.className}`}>{meta.label}</span>
                        </div>
                        <div className="mt-2 flex items-center gap-3">
                          <Stars value={review.rating} />
                          <span className="text-xs text-zinc-500">{new Date(review.createdAt).toLocaleDateString("tr-TR")}</span>
                        </div>
                        <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-zinc-300">{review.comment}</p>
                        {normalizeImageList(review.images).length > 0 && (
                          <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
                            {normalizeImageList(review.images).map((image, index) => (
                              <div key={`${review.id}-${index}`} className="relative h-20 w-20 shrink-0 overflow-hidden rounded-xl border border-zinc-800/75">
                                <Image src={image} alt={review.comment} fill className="object-cover" />
                              </div>
                            ))}
                          </div>
                        )}

                        <div className="mt-4 flex flex-wrap gap-2">
                          <button
                            type="button"
                            disabled={processing !== null}
                            onClick={() => void mutateReviews([review.id], "approve")}
                            className="rounded-xl border border-emerald-400/35 px-4 py-2 text-sm text-emerald-200 transition hover:bg-emerald-500/10 disabled:opacity-45"
                          >
                            Onayla
                          </button>
                          <button
                            type="button"
                            disabled={processing !== null}
                            onClick={() => void mutateReviews([review.id], "reject")}
                            className="rounded-xl border border-red-400/35 px-4 py-2 text-sm text-red-200 transition hover:bg-red-500/10 disabled:opacity-45"
                          >
                            Reddet
                          </button>
                          <button
                            type="button"
                            disabled={processing !== null}
                            onClick={() => void mutateReviews([review.id], "delete")}
                            className="rounded-xl border border-[#D4AF37]/30 px-4 py-2 text-sm text-[#D4AF37] transition hover:bg-[#D4AF37]/10 disabled:opacity-45"
                          >
                            Sil
                          </button>
                        </div>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
