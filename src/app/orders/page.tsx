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

export default function OrdersPage() {
  const { isAuthenticated, loading: authLoading } = useAuth();
  const [orders, setOrders] = useState<UserOrder[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (authLoading) return;
    if (!isAuthenticated) return;

    const loadOrders = async () => {
      setLoading(true);
      setError(null);

      try {
        const response = await fetch("/api/orders", { cache: "no-store" });
        if (response.status === 401) {
          setError("Siparişlerini görebilmek için giriş yapman gerekiyor.");
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
        setOrders(normalized);
      } catch {
        setError("Siparişler yüklenemedi. Lütfen tekrar deneyin.");
        setOrders([]);
      } finally {
        setLoading(false);
      }
    };

    void loadOrders();
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
            const step = Math.max(statusFlow.indexOf(order.status), 0) + 1;
            const progress = (step / statusFlow.length) * 100;
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

                <div className="mt-4">
                  <div className="mb-1 flex items-center justify-between text-xs text-zinc-400">
                    <span>Hazırlık Durumu</span>
                    <span>{step}/{statusFlow.length}</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-zinc-800">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-[#D4AF37] to-[#F3D47B]"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                </div>

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
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
