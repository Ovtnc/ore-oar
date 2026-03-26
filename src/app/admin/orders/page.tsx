"use client";

import { useEffect, useMemo, useState } from "react";
import { OrderStatus, ShippingInfo, OrderItem } from "@/lib/types";
import Link from "next/link";

type AdminOrder = {
  _id: string;
  status: OrderStatus;
  total: number;
  createdAt: string;
  updatedAt?: string;
  customerNote?: string;
  paymentNotifiedAt?: string;
  paymentVerifiedAt?: string;
  lastPaymentReminderAt?: string;
  paymentReminderCount?: number;
  shipping: ShippingInfo;
  items: OrderItem[];
};

const statuses: OrderStatus[] = [
  "Beklemede",
  "Ödeme Alındı",
  "Sipariş Hazırlanıyor",
  "Kargoya Verildi",
  "Tamamlandı",
];
const ORDERS_PAGE_SIZE = 6;

function statusMeta(status: OrderStatus) {
  if (status === "Beklemede") {
    return {
      pillClass: "border-amber-400/45 bg-amber-500/10 text-amber-200",
      ringClass: "bg-amber-300",
    };
  }
  if (status === "Ödeme Alındı") {
    return {
      pillClass: "border-sky-400/45 bg-sky-500/10 text-sky-200",
      ringClass: "bg-sky-300",
    };
  }
  if (status === "Sipariş Hazırlanıyor") {
    return {
      pillClass: "border-violet-400/45 bg-violet-500/10 text-violet-200",
      ringClass: "bg-violet-300",
    };
  }
  if (status === "Kargoya Verildi") {
    return {
      pillClass: "border-cyan-400/45 bg-cyan-500/10 text-cyan-200",
      ringClass: "bg-cyan-300",
    };
  }
  return {
    pillClass: "border-emerald-400/45 bg-emerald-500/10 text-emerald-200",
    ringClass: "bg-emerald-300",
  };
}

function formatDate(value: string) {
  return new Date(value).toLocaleString("tr-TR");
}

function isToday(value: string) {
  const d = new Date(value);
  const now = new Date();
  return (
    d.getDate() === now.getDate() &&
    d.getMonth() === now.getMonth() &&
    d.getFullYear() === now.getFullYear()
  );
}

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState<AdminOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<OrderStatus | "Tümü">("Tümü");
  const [query, setQuery] = useState("");
  const [updatingOrderId, setUpdatingOrderId] = useState<string | null>(null);
  const [deletingOrderId, setDeletingOrderId] = useState<string | null>(null);
  const [remindingOrderId, setRemindingOrderId] = useState<string | null>(null);
  const [verifyingOrderId, setVerifyingOrderId] = useState<string | null>(null);
  const [sendingWhatsappOrderId, setSendingWhatsappOrderId] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    fetch("/api/admin/orders", { cache: "no-store" })
      .then((response) => response.json())
      .then((data) => setOrders(data as AdminOrder[]))
      .catch(() => setError("Siparişler yüklenemedi."))
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return orders.filter((order) => {
      const statusOk = statusFilter === "Tümü" ? true : order.status === statusFilter;
      const queryOk = !q
        ? true
        : order._id.toLowerCase().includes(q) ||
          order.shipping.fullName.toLowerCase().includes(q) ||
          order.shipping.city.toLowerCase().includes(q);
      return statusOk && queryOk;
    });
  }, [orders, query, statusFilter]);

  const metrics = useMemo(() => {
    const totalOrders = filtered.length;
    const revenue = filtered.reduce((sum, order) => sum + Number(order.total || 0), 0);
    const todayOrders = filtered.filter((order) => isToday(order.createdAt)).length;
    const cargoReady = filtered.filter((order) => order.status === "Kargoya Verildi").length;
    const completed = filtered.filter((order) => order.status === "Tamamlandı").length;

    return {
      totalOrders,
      revenue,
      todayOrders,
      cargoReady,
      completed,
    };
  }, [filtered]);

  useEffect(() => {
    setCurrentPage(1);
  }, [statusFilter, query]);

  const totalPages = useMemo(
    () => Math.max(1, Math.ceil(filtered.length / ORDERS_PAGE_SIZE)),
    [filtered.length],
  );

  const safeCurrentPage = Math.min(currentPage, totalPages);

  const paginatedOrders = useMemo(() => {
    const start = (safeCurrentPage - 1) * ORDERS_PAGE_SIZE;
    const end = start + ORDERS_PAGE_SIZE;
    return filtered.slice(start, end);
  }, [filtered, safeCurrentPage]);

  const rangeText = useMemo(() => {
    if (filtered.length === 0) return "0 / 0";
    const start = (safeCurrentPage - 1) * ORDERS_PAGE_SIZE + 1;
    const end = Math.min(safeCurrentPage * ORDERS_PAGE_SIZE, filtered.length);
    return `${start}-${end} / ${filtered.length}`;
  }, [filtered.length, safeCurrentPage]);

  async function updateStatus(orderId: string, status: OrderStatus) {
    setUpdatingOrderId(orderId);
    try {
      const response = await fetch(`/api/admin/orders/${orderId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (!response.ok) throw new Error("Durum güncellenemedi.");
      setOrders((prev) => prev.map((o) => (o._id === orderId ? { ...o, status } : o)));
    } catch {
      setError("Sipariş durumu güncellenemedi. Lütfen tekrar deneyin.");
    } finally {
      setUpdatingOrderId(null);
    }
  }

  async function sendPaymentReminder(orderId: string, tone: "gentle" | "urgent") {
    setRemindingOrderId(orderId);
    setError(null);
    try {
      const response = await fetch(`/api/admin/orders/${orderId}/payment-reminder`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tone }),
      });
      const data = (await response.json().catch(() => null)) as { error?: string } | null;
      if (!response.ok) {
        throw new Error(data?.error ?? "Hatırlatma maili gönderilemedi.");
      }
      const now = new Date().toISOString();
      setOrders((prev) =>
        prev.map((item) =>
          item._id === orderId
            ? {
                ...item,
                lastPaymentReminderAt: now,
                paymentReminderCount: Number(item.paymentReminderCount ?? 0) + 1,
              }
            : item,
        ),
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Hatırlatma maili gönderilemedi.");
    } finally {
      setRemindingOrderId(null);
    }
  }

  async function deleteOrder(orderId: string) {
    const confirmed = window.confirm(
      "Bu siparişi silmek istediğine emin misin? Bu işlem geri alınamaz.",
    );
    if (!confirmed) return;

    setDeletingOrderId(orderId);
    setError(null);
    try {
      const response = await fetch(`/api/admin/orders/${orderId}`, {
        method: "DELETE",
      });
      const data = (await response.json().catch(() => null)) as { error?: string } | null;
      if (!response.ok) {
        throw new Error(data?.error ?? "Sipariş silinemedi.");
      }
      setOrders((prev) => prev.filter((item) => item._id !== orderId));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sipariş silinemedi.");
    } finally {
      setDeletingOrderId(null);
    }
  }

  async function verifyPayment(orderId: string) {
    setVerifyingOrderId(orderId);
    setError(null);
    try {
      const response = await fetch(`/api/admin/orders/${orderId}/verify-payment`, {
        method: "POST",
      });
      const data = (await response.json().catch(() => null)) as
        | { error?: string; paymentVerifiedAt?: string }
        | null;
      if (!response.ok) {
        throw new Error(data?.error ?? "Dekont teyidi yapılamadı.");
      }
      const verifiedAt = data?.paymentVerifiedAt ?? new Date().toISOString();
      setOrders((prev) =>
        prev.map((order) =>
          order._id === orderId
            ? { ...order, status: "Ödeme Alındı", paymentVerifiedAt: verifiedAt }
            : order,
        ),
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Dekont teyidi yapılamadı.");
    } finally {
      setVerifyingOrderId(null);
    }
  }

  async function sendQuickWhatsappMessage(
    orderId: string,
    type: "iban_and_receipt" | "payment_not_received" | "order_created",
  ) {
    setSendingWhatsappOrderId(orderId);
    setError(null);
    try {
      const response = await fetch(`/api/admin/orders/${orderId}/whatsapp-message`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type }),
      });
      const data = (await response.json().catch(() => null)) as
        | { error?: string; whatsappUrl?: string }
        | null;

      if (!response.ok) {
        throw new Error(data?.error ?? "WhatsApp mesajı hazırlanamadı.");
      }

      const url = String(data?.whatsappUrl ?? "").trim();
      if (!url) throw new Error("WhatsApp bağlantısı oluşturulamadı.");

      const popup = window.open(url, "_blank", "noopener,noreferrer");
      if (!popup) {
        window.location.href = url;
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "WhatsApp mesajı hazırlanamadı.");
    } finally {
      setSendingWhatsappOrderId(null);
    }
  }

  return (
    <section className="mx-auto w-full max-w-6xl px-4 py-10 md:px-8">
      <div className="mb-7 flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs tracking-[0.2em] text-[#D4AF37]">ADMIN HUB</p>
          <h1 className="mt-2 text-3xl font-semibold">Sipariş Yönetimi</h1>
          <p className="mt-1 text-zinc-400">Siparişleri tek ekranda izle, filtrele ve durumu hızlıca güncelle.</p>
        </div>
        <Link
          href="/admin/panel"
          className="rounded-xl border border-[#D4AF37]/40 bg-black/20 px-4 py-2 text-sm text-[#D4AF37] transition hover:bg-[#D4AF37] hover:text-black"
        >
          Geri
        </Link>
      </div>

      <div className="mb-6 grid gap-3 md:grid-cols-2 xl:grid-cols-5">
        <article className="rounded-2xl border border-[#D4AF37]/25 bg-[linear-gradient(150deg,rgba(212,175,55,0.16),rgba(212,175,55,0.02))] p-4">
          <p className="text-xs tracking-[0.18em] text-zinc-300">GÖRÜNEN SİPARİŞ</p>
          <p className="mt-2 text-3xl font-semibold text-zinc-100">{metrics.totalOrders}</p>
        </article>
        <article className="rounded-2xl border border-[#D4AF37]/20 bg-zinc-900/65 p-4">
          <p className="text-xs tracking-[0.18em] text-zinc-400">TOPLAM CİRO</p>
          <p className="mt-2 text-2xl font-semibold text-[#D4AF37]">{metrics.revenue.toLocaleString("tr-TR")} TL</p>
        </article>
        <article className="rounded-2xl border border-[#D4AF37]/20 bg-zinc-900/65 p-4">
          <p className="text-xs tracking-[0.18em] text-zinc-400">BUGÜN GELEN</p>
          <p className="mt-2 text-3xl font-semibold text-zinc-100">{metrics.todayOrders}</p>
        </article>
        <article className="rounded-2xl border border-[#D4AF37]/20 bg-zinc-900/65 p-4">
          <p className="text-xs tracking-[0.18em] text-zinc-400">KARGODA</p>
          <p className="mt-2 text-3xl font-semibold text-zinc-100">{metrics.cargoReady}</p>
        </article>
        <article className="rounded-2xl border border-[#D4AF37]/20 bg-zinc-900/65 p-4">
          <p className="text-xs tracking-[0.18em] text-zinc-400">TAMAMLANAN</p>
          <p className="mt-2 text-3xl font-semibold text-zinc-100">{metrics.completed}</p>
        </article>
      </div>

      <div className="mb-7 grid gap-3 rounded-2xl border border-[#D4AF37]/25 bg-zinc-900/60 p-4 md:grid-cols-[1fr_220px_auto]">
        <div>
          <label className="block text-xs tracking-[0.18em] text-zinc-400">Arama</label>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Sipariş no, müşteri veya şehir..."
            className="mt-2 w-full rounded-xl border border-[#D4AF37]/25 bg-black/30 px-3 py-2 text-sm outline-none transition focus:border-[#D4AF37]"
          />
        </div>
        <div>
          <label className="block text-xs tracking-[0.18em] text-zinc-400">Durum</label>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as OrderStatus | "Tümü")}
            className="mt-2 w-full rounded-xl border border-[#D4AF37]/25 bg-black/30 px-3 py-2 text-sm outline-none transition focus:border-[#D4AF37]"
          >
            <option value="Tümü">Tümü</option>
            {statuses.map((s) => (
              <option key={s} value={s}>
                {s}
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

      {loading ? (
        <div className="rounded-2xl border border-[#D4AF37]/20 bg-zinc-900/50 p-6 text-zinc-300">Yükleniyor...</div>
      ) : error ? (
        <div className="rounded-2xl border border-red-400/30 bg-red-950/20 p-6 text-red-200">{error}</div>
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl border border-[#D4AF37]/20 bg-zinc-900/50 p-6 text-zinc-300">Henüz sipariş yok.</div>
      ) : (
        <div>
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[#D4AF37]/20 bg-zinc-900/55 px-4 py-3">
            <p className="text-xs tracking-[0.18em] text-zinc-400">Liste: {rangeText}</p>
            {totalPages > 1 && (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setCurrentPage(Math.max(1, safeCurrentPage - 1))}
                  disabled={safeCurrentPage <= 1}
                  className="rounded-lg border border-[#D4AF37]/35 px-3 py-1.5 text-xs text-zinc-200 transition hover:border-[#D4AF37] disabled:cursor-not-allowed disabled:opacity-45"
                >
                  Önceki
                </button>
                <p className="text-xs text-zinc-400">
                  Sayfa {safeCurrentPage} / {totalPages}
                </p>
                <button
                  type="button"
                  onClick={() => setCurrentPage(Math.min(totalPages, safeCurrentPage + 1))}
                  disabled={safeCurrentPage >= totalPages}
                  className="rounded-lg border border-[#D4AF37]/35 px-3 py-1.5 text-xs text-zinc-200 transition hover:border-[#D4AF37] disabled:cursor-not-allowed disabled:opacity-45"
                >
                  Sonraki
                </button>
              </div>
            )}
          </div>

          <div className="grid gap-5 md:grid-cols-2">
            {paginatedOrders.map((order) => (
            <article
              key={order._id}
              className="rounded-2xl border border-[#D4AF37]/20 bg-[linear-gradient(150deg,rgba(25,25,25,0.86),rgba(10,10,10,0.94))] p-5 shadow-[0_14px_36px_rgba(0,0,0,0.35)]"
            >
              <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_auto] md:items-start">
                <div className="min-w-0 space-y-2">
                  <p className="text-xs tracking-[0.24em] text-[#D4AF37]">#{order._id}</p>
                  <p className="text-lg font-semibold text-zinc-100">{order.shipping.fullName}</p>
                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    <span className="rounded-full border border-zinc-700/70 bg-black/30 px-2.5 py-1 text-zinc-300">
                      {order.shipping.city} / {order.shipping.country}
                    </span>
                    <span className="rounded-full border border-zinc-700/70 bg-black/30 px-2.5 py-1 text-zinc-300">
                      {formatDate(order.createdAt)}
                    </span>
                  </div>
                </div>

                <div className="flex flex-col items-start gap-2 md:items-end md:text-right">
                  <span className={`inline-flex items-center rounded-full border px-3 py-1 text-xs ${statusMeta(order.status).pillClass}`}>
                    <span className={`mr-2 h-1.5 w-1.5 rounded-full ${statusMeta(order.status).ringClass}`} />
                    {order.status}
                  </span>
                  <p className="text-lg font-semibold text-[#D4AF37]">
                    {Number(order.total || 0).toLocaleString("tr-TR")} TL
                  </p>
                  <select
                    value={order.status}
                    disabled={updatingOrderId === order._id || deletingOrderId === order._id}
                    onChange={(e) => updateStatus(order._id, e.target.value as OrderStatus)}
                    className="rounded-xl border border-[#D4AF37]/35 bg-black/45 px-3 py-2 text-sm outline-none transition focus:border-[#D4AF37] disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {statuses.map((status) => (
                      <option key={status} value={status}>
                        {status}
                      </option>
                    ))}
                  </select>
                  {order.status === "Beklemede" && (
                    <div className="mt-1 flex flex-wrap items-center gap-2 md:justify-end">
                      <button
                        type="button"
                        disabled={remindingOrderId === order._id}
                        onClick={() => sendPaymentReminder(order._id, "gentle")}
                        className="rounded-lg border border-[#D4AF37]/35 px-2.5 py-1 text-[11px] text-[#D4AF37] transition hover:bg-[#D4AF37]/12 disabled:opacity-50"
                      >
                        {remindingOrderId === order._id ? "Gönderiliyor..." : "Hatırlatma Maili"}
                      </button>
                      <button
                        type="button"
                        disabled={remindingOrderId === order._id}
                        onClick={() => sendPaymentReminder(order._id, "urgent")}
                        className="rounded-lg border border-amber-400/35 px-2.5 py-1 text-[11px] text-amber-200 transition hover:bg-amber-500/10 disabled:opacity-50"
                      >
                        Acil Hatırlatma
                      </button>
                      {!order.paymentVerifiedAt && (
                        <button
                          type="button"
                          disabled={verifyingOrderId === order._id}
                          onClick={() => verifyPayment(order._id)}
                          className="rounded-lg border border-emerald-400/45 px-2.5 py-1 text-[11px] text-emerald-200 transition hover:bg-emerald-500/10 disabled:opacity-50"
                        >
                          {verifyingOrderId === order._id ? "İşleniyor..." : "Ödeme Alındı Olarak İşaretle"}
                        </button>
                      )}
                    </div>
                  )}
                  {order.status === "Beklemede" && order.paymentNotifiedAt && (
                    <p className="text-[10px] text-amber-300/80">
                      Müşteri ödeme bildirimi yaptı: {formatDate(order.paymentNotifiedAt)}
                    </p>
                  )}
                  {order.paymentVerifiedAt && (
                    <p className="text-[10px] text-emerald-300/80">
                      Dekont teyit edildi: {formatDate(order.paymentVerifiedAt)}
                    </p>
                  )}
                  {order.lastPaymentReminderAt && (
                    <p className="text-[10px] text-zinc-500">
                      Son hatırlatma: {formatDate(order.lastPaymentReminderAt)} ({order.paymentReminderCount ?? 1})
                    </p>
                  )}
                  <div className="mt-1 flex flex-wrap items-center gap-2 md:justify-end">
                    <button
                      type="button"
                      disabled={sendingWhatsappOrderId === order._id}
                      onClick={() => sendQuickWhatsappMessage(order._id, "iban_and_receipt")}
                      className="rounded-lg border border-emerald-400/45 px-2.5 py-1 text-[11px] text-emerald-200 transition hover:bg-emerald-500/10 disabled:opacity-50"
                    >
                      {sendingWhatsappOrderId === order._id ? "Hazırlanıyor..." : "WA: IBAN + Dekont"}
                    </button>
                    <button
                      type="button"
                      disabled={sendingWhatsappOrderId === order._id}
                      onClick={() => sendQuickWhatsappMessage(order._id, "payment_not_received")}
                      className="rounded-lg border border-amber-400/40 px-2.5 py-1 text-[11px] text-amber-200 transition hover:bg-amber-500/10 disabled:opacity-50"
                    >
                      WA: Ödeme Gelmedi
                    </button>
                    <button
                      type="button"
                      disabled={sendingWhatsappOrderId === order._id}
                      onClick={() => sendQuickWhatsappMessage(order._id, "order_created")}
                      className="rounded-lg border border-sky-400/40 px-2.5 py-1 text-[11px] text-sky-200 transition hover:bg-sky-500/10 disabled:opacity-50"
                    >
                      WA: Sipariş Oluştu
                    </button>
                  </div>
                  <button
                    type="button"
                    disabled={deletingOrderId === order._id}
                    onClick={() => deleteOrder(order._id)}
                    className="mt-1 rounded-lg border border-red-400/35 px-2.5 py-1 text-[11px] text-red-200 transition hover:bg-red-500/10 disabled:opacity-50"
                  >
                    {deletingOrderId === order._id ? "Siliniyor..." : "Siparişi Sil"}
                  </button>
                </div>
              </div>

              <div className="mt-4">
                <div className="mb-1 flex items-center justify-between text-xs text-zinc-400">
                  <span>Sipariş Akışı</span>
                  <span>
                    Adım {Math.max(statuses.indexOf(order.status), 0) + 1} / {statuses.length}
                  </span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-zinc-800/80">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-[#D4AF37]/80 to-[#F3D47B]"
                    style={{
                      width: `${((Math.max(statuses.indexOf(order.status), 0) + 1) / statuses.length) * 100}%`,
                    }}
                  />
                </div>
              </div>

              <div className="mt-4 grid gap-3 rounded-2xl border border-zinc-800/60 bg-black/25 p-4 md:grid-cols-[1fr_1fr]">
                <article className="rounded-xl border border-zinc-800/65 bg-black/30 p-3">
                  <p className="text-xs tracking-[0.18em] text-zinc-400">TESLİMAT</p>
                  <p className="mt-2 text-sm text-zinc-100">{order.shipping.fullName}</p>
                  <p className="mt-1 text-sm text-zinc-300">{order.shipping.phone}</p>
                  <p className="mt-1 text-sm text-zinc-400">{order.shipping.email}</p>
                  <p className="mt-3 text-sm text-zinc-300">
                    {order.shipping.address}, {order.shipping.city}
                    {order.shipping.postalCode ? `, ${order.shipping.postalCode}` : ""}
                  </p>
                </article>

                <article className="rounded-xl border border-zinc-800/65 bg-black/30 p-3">
                  <p className="text-xs tracking-[0.18em] text-zinc-400">ÜRÜNLER</p>
                  <div className="mt-2 space-y-2">
                    {order.items.length === 0 ? (
                      <p className="text-sm text-zinc-500">Ürün bilgisi yok.</p>
                    ) : (
                      order.items.map((item) => (
                        <div
                          key={`${item.productId}-${item.coatingOptionId ?? "none"}-${item.name}`}
                          className="rounded-lg border border-zinc-800/70 bg-black/30 px-3 py-2 text-sm"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <p className="text-zinc-100">
                              {item.name}
                              {item.coatingName ? ` (${item.coatingName})` : ""}
                            </p>
                            <p className="whitespace-nowrap text-zinc-400">× {item.quantity}</p>
                          </div>
                          <p className="mt-1 text-xs text-zinc-400">
                            {(Number(item.price || 0) * Number(item.quantity || 0)).toLocaleString("tr-TR")} TL
                          </p>
                        </div>
                      ))
                    )}
                  </div>
                </article>
              </div>

              {order.customerNote && (
                <div className="mt-3 rounded-xl border border-[#D4AF37]/20 bg-black/25 p-3">
                  <p className="text-xs tracking-[0.18em] text-[#D4AF37]">SİPARİŞ MESAJI</p>
                  <p className="mt-2 whitespace-pre-wrap text-sm text-zinc-200">{order.customerNote}</p>
                </div>
              )}
            </article>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
