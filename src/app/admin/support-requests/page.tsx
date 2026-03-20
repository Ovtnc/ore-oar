"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { SupportRequestStatus } from "@/lib/types";

type SupportRequestItem = {
  _id: string;
  orderId: string;
  userName: string;
  userEmail: string;
  productName: string;
  productVariant?: string;
  subject: string;
  message: string;
  status: SupportRequestStatus;
  createdAt: string;
  lastReplyAt?: string;
  replyCount?: number;
};

const SUPPORT_STATUSES: SupportRequestStatus[] = ["Yeni", "İnceleniyor", "Çözüldü"];
const QUICK_SUPPORT_REPLIES = [
  {
    title: "Genel Bilgilendirme",
    text: "Talebinizi aldık. Ekibimiz bugün içinde inceleyip sizi tekrar bilgilendirecek.",
  },
  {
    title: "Ödeme Kontrol Yanıtı",
    text: "Ödemeniz kontrol ediliyor. Onaylandığında sipariş durumunuz anında güncellenecek.",
  },
  {
    title: "Kargo Takip Yanıtı",
    text: "Kargo sürecini kontrol ediyoruz. Takip bilgisi hazırlanır hazırlanmaz size iletilecek.",
  },
] as const;
const PAGE_SIZE = 6;

export default function AdminSupportRequestsPage() {
  const [requests, setRequests] = useState<SupportRequestItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<SupportRequestStatus | "Tümü">("Tümü");
  const [query, setQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [supportUpdateId, setSupportUpdateId] = useState<string | null>(null);
  const [supportReplyDrafts, setSupportReplyDrafts] = useState<Record<string, string>>({});
  const [supportReplySendingId, setSupportReplySendingId] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    async function load() {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch("/api/admin/support-requests", { cache: "no-store" });
        const data = (await response.json().catch(() => null)) as SupportRequestItem[] | { error?: string } | null;
        if (!response.ok || !Array.isArray(data)) {
          throw new Error((data as { error?: string } | null)?.error ?? "Talepler yüklenemedi.");
        }
        if (!mounted) return;
        setRequests(data);
      } catch (err) {
        if (!mounted) return;
        setError(err instanceof Error ? err.message : "Talepler yüklenemedi.");
      } finally {
        if (!mounted) return;
        setLoading(false);
      }
    }

    void load();
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    setCurrentPage(1);
  }, [statusFilter, query]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return requests.filter((item) => {
      const statusOk = statusFilter === "Tümü" ? true : item.status === statusFilter;
      const queryOk = !q
        ? true
        : item._id.toLowerCase().includes(q) ||
          item.orderId.toLowerCase().includes(q) ||
          item.userName.toLowerCase().includes(q) ||
          item.subject.toLowerCase().includes(q);
      return statusOk && queryOk;
    });
  }, [requests, statusFilter, query]);

  const totalPages = useMemo(() => Math.max(1, Math.ceil(filtered.length / PAGE_SIZE)), [filtered.length]);
  const safePage = Math.min(currentPage, totalPages);

  const paginated = useMemo(() => {
    const start = (safePage - 1) * PAGE_SIZE;
    const end = start + PAGE_SIZE;
    return filtered.slice(start, end);
  }, [filtered, safePage]);

  const stats = useMemo(() => {
    const total = requests.length;
    const fresh = requests.filter((item) => item.status === "Yeni").length;
    const active = requests.filter((item) => item.status === "İnceleniyor").length;
    const done = requests.filter((item) => item.status === "Çözüldü").length;
    return { total, fresh, active, done };
  }, [requests]);

  async function updateSupportStatus(id: string, status: SupportRequestStatus) {
    setSupportUpdateId(id);
    setError(null);
    try {
      const response = await fetch("/api/admin/support-requests", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status }),
      });
      const data = (await response.json().catch(() => null)) as { error?: string } | null;
      if (!response.ok) {
        throw new Error(data?.error ?? "Talep durumu güncellenemedi.");
      }
      setRequests((prev) => prev.map((item) => (item._id === id ? { ...item, status } : item)));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Talep durumu güncellenemedi.");
    } finally {
      setSupportUpdateId(null);
    }
  }

  async function sendSupportReply(requestId: string, message: string) {
    const normalized = String(message ?? "").trim();
    if (normalized.length < 4) {
      setError("Yanıt en az 4 karakter olmalı.");
      return;
    }

    setSupportReplySendingId(requestId);
    setError(null);
    try {
      const response = await fetch(`/api/admin/support-requests/${requestId}/reply`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: normalized }),
      });
      const data = (await response.json().catch(() => null)) as { error?: string; sentAt?: string } | null;
      if (!response.ok) {
        throw new Error(data?.error ?? "Yanıt e-postası gönderilemedi.");
      }

      const sentAt = data?.sentAt ?? new Date().toISOString();
      setRequests((prev) =>
        prev.map((item) =>
          item._id === requestId
            ? {
                ...item,
                status: item.status === "Yeni" ? "İnceleniyor" : item.status,
                lastReplyAt: sentAt,
                replyCount: Number(item.replyCount ?? 0) + 1,
              }
            : item,
        ),
      );
      setSupportReplyDrafts((prev) => ({ ...prev, [requestId]: "" }));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Yanıt e-postası gönderilemedi.");
    } finally {
      setSupportReplySendingId(null);
    }
  }

  return (
    <section className="mx-auto w-full max-w-6xl px-4 py-10 md:px-8">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs tracking-[0.24em] text-[#D4AF37]">SUPPORT DESK</p>
          <h1 className="mt-2 text-3xl font-semibold text-zinc-100">Taleplerim</h1>
          <p className="mt-2 text-sm text-zinc-300">İletişim taleplerini ayrı ekranda yönet, hızlı veya özel yanıtı mail olarak gönder.</p>
        </div>
        <Link
          href="/admin/panel"
          className="rounded-xl border border-[#D4AF37]/40 bg-black/20 px-4 py-2 text-sm text-[#D4AF37] transition hover:bg-[#D4AF37] hover:text-black"
        >
          Dashboard
        </Link>
      </div>

      <div className="mb-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <article className="rounded-2xl border border-[#D4AF37]/25 bg-zinc-900/60 p-4">
          <p className="text-xs tracking-[0.18em] text-zinc-400">TOPLAM TALEP</p>
          <p className="mt-2 text-3xl font-semibold text-zinc-100">{stats.total}</p>
        </article>
        <article className="rounded-2xl border border-cyan-400/30 bg-cyan-500/10 p-4">
          <p className="text-xs tracking-[0.18em] text-cyan-200">YENİ</p>
          <p className="mt-2 text-3xl font-semibold text-cyan-100">{stats.fresh}</p>
        </article>
        <article className="rounded-2xl border border-amber-400/30 bg-amber-500/10 p-4">
          <p className="text-xs tracking-[0.18em] text-amber-200">İNCELEMEDE</p>
          <p className="mt-2 text-3xl font-semibold text-amber-100">{stats.active}</p>
        </article>
        <article className="rounded-2xl border border-emerald-400/30 bg-emerald-500/10 p-4">
          <p className="text-xs tracking-[0.18em] text-emerald-200">ÇÖZÜLDÜ</p>
          <p className="mt-2 text-3xl font-semibold text-emerald-100">{stats.done}</p>
        </article>
      </div>

      <div className="mb-5 grid gap-3 rounded-2xl border border-[#D4AF37]/25 bg-zinc-900/60 p-4 md:grid-cols-[1fr_220px_auto]">
        <div>
          <label className="block text-xs tracking-[0.18em] text-zinc-400">Arama</label>
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Talep no, sipariş no, müşteri veya konu..."
            className="mt-2 w-full rounded-xl border border-[#D4AF37]/25 bg-black/30 px-3 py-2 text-sm outline-none transition focus:border-[#D4AF37]"
          />
        </div>
        <div>
          <label className="block text-xs tracking-[0.18em] text-zinc-400">Durum</label>
          <select
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value as SupportRequestStatus | "Tümü")}
            className="mt-2 w-full rounded-xl border border-[#D4AF37]/25 bg-black/30 px-3 py-2 text-sm outline-none transition focus:border-[#D4AF37]"
          >
            <option value="Tümü">Tümü</option>
            {SUPPORT_STATUSES.map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </select>
        </div>
        <button
          type="button"
          onClick={() => {
            setQuery("");
            setStatusFilter("Tümü");
          }}
          className="h-fit self-end rounded-xl border border-[#D4AF37]/35 px-4 py-2 text-sm text-[#D4AF37] transition hover:bg-[#D4AF37]/12"
        >
          Filtreyi Temizle
        </button>
      </div>

      {error && <div className="mb-4 rounded-xl border border-red-400/30 bg-red-950/20 p-4 text-red-200">{error}</div>}

      {loading ? (
        <div className="rounded-2xl border border-[#D4AF37]/20 bg-zinc-900/50 p-6 text-zinc-300">Yükleniyor...</div>
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl border border-[#D4AF37]/20 bg-zinc-900/50 p-6 text-zinc-300">Talep bulunamadı.</div>
      ) : (
        <div className="space-y-3">
          {paginated.map((request) => (
            <article key={request._id} className="rounded-xl border border-[#D4AF37]/20 bg-black/20 p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-xs tracking-[0.2em] text-[#D4AF37]">#{request._id}</p>
                  <p className="mt-1 text-sm font-semibold text-zinc-100">
                    {request.userName} • Sipariş #{request.orderId}
                  </p>
                  <p className="mt-1 text-sm text-zinc-300">
                    {request.productName}
                    {request.productVariant ? ` (${request.productVariant})` : ""}
                  </p>
                  <p className="mt-1 text-xs text-zinc-500">{new Date(request.createdAt).toLocaleString("tr-TR")}</p>
                </div>
                <select
                  value={request.status}
                  onChange={(event) => updateSupportStatus(request._id, event.target.value as SupportRequestStatus)}
                  disabled={supportUpdateId === request._id}
                  className="rounded-lg border border-[#D4AF37]/30 bg-black/30 px-3 py-2 text-xs text-zinc-200 outline-none transition focus:border-[#D4AF37] disabled:opacity-60"
                >
                  {SUPPORT_STATUSES.map((status) => (
                    <option key={status} value={status}>
                      {status}
                    </option>
                  ))}
                </select>
              </div>

              <p className="mt-2 text-xs tracking-[0.18em] text-zinc-400">KONU: {request.subject}</p>
              <p className="mt-1 whitespace-pre-wrap text-sm text-zinc-300">{request.message}</p>
              {request.lastReplyAt && (
                <p className="mt-2 text-xs text-zinc-500">
                  Son yanıt: {new Date(request.lastReplyAt).toLocaleString("tr-TR")} ({request.replyCount ?? 1})
                </p>
              )}

              <div className="mt-3 flex flex-wrap gap-2">
                {QUICK_SUPPORT_REPLIES.map((quickReply) => (
                  <button
                    key={`${request._id}-${quickReply.title}`}
                    type="button"
                    onClick={() =>
                      setSupportReplyDrafts((prev) => ({
                        ...prev,
                        [request._id]: quickReply.text,
                      }))
                    }
                    className="rounded-lg border border-[#D4AF37]/30 px-2.5 py-1 text-[11px] text-[#D4AF37] transition hover:bg-[#D4AF37]/10"
                  >
                    {quickReply.title}
                  </button>
                ))}
              </div>

              <div className="mt-3">
                <textarea
                  value={supportReplyDrafts[request._id] ?? ""}
                  onChange={(event) =>
                    setSupportReplyDrafts((prev) => ({
                      ...prev,
                      [request._id]: event.target.value,
                    }))
                  }
                  rows={3}
                  placeholder="Özel yanıtını yaz..."
                  className="w-full rounded-xl border border-[#D4AF37]/25 bg-black/35 px-3 py-2 text-sm text-zinc-100 outline-none transition focus:border-[#D4AF37]"
                />
                <div className="mt-2 flex justify-end">
                  <button
                    type="button"
                    disabled={supportReplySendingId === request._id}
                    onClick={() => sendSupportReply(request._id, supportReplyDrafts[request._id] ?? "")}
                    className="rounded-lg border border-[#D4AF37] bg-[#D4AF37] px-3 py-1.5 text-xs font-semibold text-black transition hover:bg-transparent hover:text-[#D4AF37] disabled:opacity-50"
                  >
                    {supportReplySendingId === request._id ? "Gönderiliyor..." : "Özel Yanıtı Mail At"}
                  </button>
                </div>
              </div>
            </article>
          ))}

          {totalPages > 1 && (
            <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[#D4AF37]/20 bg-black/20 p-3">
              <p className="text-xs text-zinc-400">
                Sayfa {safePage} / {totalPages}
              </p>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setCurrentPage(Math.max(1, safePage - 1))}
                  disabled={safePage <= 1}
                  className="rounded-lg border border-[#D4AF37]/35 px-3 py-1.5 text-xs text-zinc-200 transition hover:border-[#D4AF37] disabled:cursor-not-allowed disabled:opacity-45"
                >
                  Önceki
                </button>
                <button
                  type="button"
                  onClick={() => setCurrentPage(Math.min(totalPages, safePage + 1))}
                  disabled={safePage >= totalPages}
                  className="rounded-lg border border-[#D4AF37]/35 px-3 py-1.5 text-xs text-zinc-200 transition hover:border-[#D4AF37] disabled:cursor-not-allowed disabled:opacity-45"
                >
                  Sonraki
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
