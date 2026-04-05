"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useAuth } from "@/components/auth-provider";
import { Order, OrderStatus } from "@/lib/types";

type UserOrder = Order & { _id: string };

const statusFlow: OrderStatus[] = [
  "Beklemede",
  "Ödeme Alındı",
  "Sipariş Hazırlanıyor",
  "Kargoya Verildi",
  "Tamamlandı",
];

const orderTimelineSteps = [
  "Sipariş Verildi",
  "Ödeme Bekleniyor",
  "Ödeme Onaylandı",
  "Atölyede Hazırlanıyor",
  "Kargoya Verildi",
];

function statusMeta(status: OrderStatus) {
  if (status === "Beklemede") {
    return { className: "border-amber-400/45 bg-amber-500/10 text-amber-200" };
  }
  if (status === "Ödeme Alındı") {
    return { className: "border-sky-400/45 bg-sky-500/10 text-sky-200" };
  }
  if (status === "Sipariş Hazırlanıyor") {
    return { className: "border-violet-400/45 bg-violet-500/10 text-violet-200" };
  }
  if (status === "Kargoya Verildi") {
    return { className: "border-cyan-400/45 bg-cyan-500/10 text-cyan-200" };
  }
  return { className: "border-emerald-400/45 bg-emerald-500/10 text-emerald-200" };
}

function toId(value: unknown, fallback: string) {
  if (typeof value === "string") return value;
  if (value && typeof value === "object" && "toString" in value) {
    const result = (value as { toString: () => string }).toString();
    if (result && result !== "[object Object]") return result;
  }
  return fallback;
}

function OrderTimeline({ status }: { status: OrderStatus }) {
  const statusIndex = Math.max(statusFlow.indexOf(status), 0);
  const timelineIndex = status === "Beklemede" ? 1 : Math.min(statusIndex + 1, orderTimelineSteps.length - 1);
  const completedPercent = (timelineIndex / Math.max(orderTimelineSteps.length - 1, 1)) * 100;

  return (
    <div className="mt-4 rounded-xl border border-[#D4AF37]/18 bg-black/20 p-3">
      <div className="mb-2 flex items-center justify-between text-xs text-zinc-400">
        <span>Sipariş Takibi</span>
        <span>
          Adım {timelineIndex + 1} / {orderTimelineSteps.length}
        </span>
      </div>

      <div className="relative mb-3 h-2 rounded-full bg-zinc-800">
        <div
          className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-[#D4AF37] to-[#F3D47B] transition-all duration-500"
          style={{ width: `${completedPercent}%` }}
        />
      </div>

      <ol className="grid grid-cols-5 gap-2">
        {orderTimelineSteps.map((step, index) => {
          const completed = index < timelineIndex;
          const current = index === timelineIndex;
          const stateClass = completed
            ? "border-[#D4AF37]/70 bg-[#D4AF37]/20 text-[#F3D47B]"
            : current
              ? "border-[#D4AF37] bg-[#D4AF37]/22 text-[#F3D47B] shadow-[0_0_20px_rgba(212,175,55,0.55)] animate-pulse"
              : "border-zinc-700 bg-zinc-900/65 text-zinc-500";

          return (
            <li key={step} className="text-center">
              <span className={`mx-auto inline-flex h-7 w-7 items-center justify-center rounded-full border text-[11px] font-semibold ${stateClass}`}>
                {index + 1}
              </span>
              <p className={`mt-1 text-[10px] leading-tight ${current ? "text-[#F3D47B]" : completed ? "text-zinc-300" : "text-zinc-500"}`}>
                {step}
              </p>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

export default function OrdersPage() {
  const { isAuthenticated, loading: authLoading } = useAuth();
  const [orders, setOrders] = useState<UserOrder[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (authLoading) return;
    if (!isAuthenticated) return;

    let active = true;

    const loadOrders = async (silent = false) => {
      if (!silent) {
        setLoading(true);
      }
      setError((prev) => (silent ? prev : null));

      try {
        const response = await fetch("/api/orders", { cache: "no-store" });
        if (response.status === 401) {
          if (!active) return;
          if (!silent) {
            setError("Siparişlerini görebilmek için giriş yapman gerekiyor.");
          }
          setOrders([]);
          return;
        }
        if (!response.ok) {
          throw new Error("Siparişler alınamadı.");
        }

        const data = (await response.json()) as Order[];
        const normalized = data.map((order, index) => ({
          ...order,
          _id: toId(order._id, `order-${index}`),
        }));
        if (!active) return;
        setOrders(normalized);
      } catch {
        if (!active) return;
        if (!silent) {
          setError("Siparişler yüklenemedi. Lütfen tekrar deneyin.");
        }
      } finally {
        if (!active) return;
        if (!silent) {
          setLoading(false);
        }
      }
    };

    void loadOrders();

    const interval = setInterval(() => {
      void loadOrders(true);
    }, 6000);

    const onFocus = () => {
      void loadOrders(true);
    };
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onFocus);

    return () => {
      active = false;
      clearInterval(interval);
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onFocus);
    };
  }, [authLoading, isAuthenticated]);

  if (authLoading || loading) {
    return (
      <section className="mx-auto w-full max-w-6xl px-4 py-10 md:px-8">
        <div className="lux-card p-8 text-zinc-300">Siparişler yükleniyor...</div>
      </section>
    );
  }

  if (!isAuthenticated) {
    return (
      <section className="mx-auto w-full max-w-3xl px-4 py-10 md:px-8">
        <div className="lux-card p-8">
          <h1 className="text-3xl font-semibold text-zinc-100">Siparişlerim</h1>
          <p className="mt-3 text-zinc-300">Sipariş geçmişini görmek için hesabına giriş yap.</p>
          <div className="mt-4 flex flex-wrap gap-3">
            <Link
              href="/login?next=/orders"
              className="rounded-lg border border-[#D4AF37] bg-[#D4AF37] px-4 py-2 text-sm font-semibold text-black"
            >
              Giriş Yap
            </Link>
            <Link
              href="/signup?next=/orders"
              className="rounded-lg border border-[#D4AF37]/40 px-4 py-2 text-sm text-[#D4AF37]"
            >
              Üye Ol
            </Link>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="mx-auto w-full max-w-6xl px-4 py-10 md:px-8">
      <h1 className="text-4xl font-semibold text-zinc-100">Siparişlerim</h1>
      <p className="mt-2 text-sm text-zinc-400">Tüm sipariş geçmişin, ödeme ve hazırlık durumuyla birlikte burada.</p>

      {error && (
        <div className="mt-5 rounded-2xl border border-red-400/35 bg-red-950/20 p-4 text-red-200">{error}</div>
      )}

      {orders.length === 0 ? (
        <div className="mt-6 rounded-2xl border border-[#D4AF37]/20 bg-zinc-900/50 p-8 text-center">
          <p className="text-zinc-300">Henüz siparişin bulunmuyor.</p>
          <Link href="/products" className="mt-4 inline-block text-[#D4AF37] hover:underline">
            Ürünlere Göz At
          </Link>
        </div>
      ) : (
        <div className="mt-6 grid gap-4">
          {orders.map((order) => {
            return (
              <article
                key={order._id}
                className="rounded-2xl border border-[#D4AF37]/20 bg-[linear-gradient(150deg,rgba(25,25,25,0.86),rgba(10,10,10,0.94))] p-5"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-xs tracking-[0.22em] text-[#D4AF37]">#{order._id}</p>
                    <p className="mt-2 text-sm text-zinc-400">{new Date(order.createdAt).toLocaleString("tr-TR")}</p>
                  </div>
                  <div className="text-right">
                    <span className={`inline-flex rounded-full border px-3 py-1 text-xs ${statusMeta(order.status).className}`}>
                      {order.status}
                    </span>
                    <p className="mt-2 text-lg font-semibold text-[#D4AF37]">
                      {Number(order.total || 0).toLocaleString("tr-TR")} TL
                    </p>
                  </div>
                </div>
                <OrderTimeline status={order.status} />

                <div className="mt-4 grid gap-3 rounded-xl border border-zinc-800/60 bg-black/25 p-3 md:grid-cols-[1fr_1fr]">
                  <div>
                    <p className="text-xs tracking-[0.18em] text-zinc-400">TESLİMAT</p>
                    <p className="mt-2 text-sm text-zinc-100">{order.shipping.fullName}</p>
                    <p className="mt-1 text-sm text-zinc-300">{order.shipping.phone}</p>
                    <p className="mt-1 text-sm text-zinc-400">{order.shipping.email}</p>
                  </div>
                  <div>
                    <p className="text-xs tracking-[0.18em] text-zinc-400">ÜRÜNLER</p>
                    <div className="mt-2 space-y-1">
                      {order.items.map((item) => (
                        <div
                          key={`${item.productId}-${item.coatingOptionId ?? "none"}-${item.name}`}
                          className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-zinc-800/60 bg-black/20 px-2.5 py-2"
                        >
                          <p className="text-sm text-zinc-200">
                            {item.name}
                            {item.coatingName ? ` (${item.coatingName})` : ""} × {item.quantity}
                          </p>
                          <Link
                            href={`/contact?orderId=${encodeURIComponent(order._id)}&productId=${encodeURIComponent(item.productId)}`}
                            className="rounded-full border border-[#D4AF37]/35 px-2.5 py-1 text-[11px] text-[#D4AF37] transition hover:bg-[#D4AF37]/10"
                          >
                            Sorun Bildir
                          </Link>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {order.customerNote && (
                  <div className="mt-3 rounded-xl border border-[#D4AF37]/20 bg-black/25 p-3">
                    <p className="text-xs tracking-[0.18em] text-[#D4AF37]">SİPARİŞ MESAJIN</p>
                    <p className="mt-2 whitespace-pre-wrap text-sm text-zinc-200">{order.customerNote}</p>
                  </div>
                )}

                <div className="mt-4 rounded-xl border border-[#D4AF37]/22 bg-black/25 p-3">
                  <p className="text-sm text-zinc-200">Bu siparişle ilgili bir sorunuz mu var?</p>
                  <Link
                    href={`/contact?orderId=${encodeURIComponent(order._id)}${
                      order.items[0]?.productId ? `&productId=${encodeURIComponent(order.items[0].productId)}` : ""
                    }`}
                    className="mt-2 inline-flex rounded-lg border border-[#D4AF37]/45 px-3 py-2 text-xs font-medium text-[#D4AF37] transition hover:bg-[#D4AF37]/10"
                  >
                    Destek Talebi Oluştur (#{order._id})
                  </Link>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
