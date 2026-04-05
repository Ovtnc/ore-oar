"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  Area,
  AreaChart,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { AlertTriangle, ChartSpline, CircleDollarSign, ClipboardList, Layers, PackageSearch } from "lucide-react";
import { OrderItem, OrderStatus, Product, ProductReview, ShippingInfo } from "@/lib/types";

type AdminOrder = {
  _id: string;
  status: OrderStatus;
  total: number;
  createdAt: string;
  shipping: ShippingInfo;
  items: OrderItem[];
};

const collections = ["Atelier 01", "Monolith", "Arc Form", "Forge"] as const;
const paidStatuses = new Set<OrderStatus>(["Ödeme Alındı", "Sipariş Hazırlanıyor", "Kargoya Verildi", "Tamamlandı"]);

function toShortDate(value: Date) {
  return value.toLocaleDateString("tr-TR", { day: "2-digit", month: "2-digit" });
}

function statusLabel(status: OrderStatus) {
  if (status === "Beklemede") return "Ödeme Bekliyor";
  if (status === "Ödeme Alındı") return "Ödeme Onaylandı";
  if (status === "Sipariş Hazırlanıyor") return "Hazırlanıyor";
  if (status === "Kargoya Verildi") return "Kargolandı";
  return "Tamamlandı";
}

function statusClass(status: OrderStatus) {
  if (status === "Beklemede") return "border-zinc-500/40 bg-zinc-600/20 text-zinc-200";
  if (status === "Ödeme Alındı") return "border-[#D4AF37]/45 bg-[#D4AF37]/14 text-[#F3D47B]";
  if (status === "Sipariş Hazırlanıyor") return "border-sky-400/45 bg-sky-500/10 text-sky-200";
  if (status === "Kargoya Verildi") return "border-emerald-400/45 bg-emerald-500/10 text-emerald-200";
  return "border-violet-400/40 bg-violet-500/10 text-violet-200";
}

export default function AdminDashboardPage() {
  const [orders, setOrders] = useState<AdminOrder[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [reviews, setReviews] = useState<ProductReview[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedDay, setSelectedDay] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const [ordersRes, productsRes, reviewsRes] = await Promise.all([
          fetch("/api/admin/orders", { cache: "no-store" }),
          fetch("/api/admin/products", { cache: "no-store" }),
          fetch("/api/admin/reviews", { cache: "no-store" }),
        ]);
        if (!ordersRes.ok || !productsRes.ok || !reviewsRes.ok) throw new Error("Dashboard verileri alınamadı.");
        const [ordersData, productsData, reviewsData] = await Promise.all([
          ordersRes.json(),
          productsRes.json(),
          reviewsRes.json(),
        ]);
        if (!mounted) return;
        const reviewPayload = reviewsData as { reviews?: ProductReview[] } | null;
        setOrders(ordersData as AdminOrder[]);
        setProducts(productsData as Product[]);
        setReviews(Array.isArray(reviewPayload?.reviews) ? reviewPayload.reviews : []);
      } catch (err) {
        if (!mounted) return;
        setError(err instanceof Error ? err.message : "Dashboard verileri alınamadı.");
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

  const analytics = useMemo(() => {
    const productMap = new Map(products.map((p) => [p.id, p]));
    const pendingPayments = orders.filter((order) => order.status === "Beklemede");
    const totalSales = orders
      .filter((order) => paidStatuses.has(order.status))
      .reduce((sum, order) => sum + Number(order.total || 0), 0);

    const collectionRevenue = new Map<string, number>(collections.map((collection) => [collection, 0]));
    for (const order of orders) {
      if (!paidStatuses.has(order.status)) continue;
      for (const item of order.items) {
        const product = productMap.get(item.productId);
        const collection = product?.collection ?? "Atelier 01";
        const current = collectionRevenue.get(collection) ?? 0;
        collectionRevenue.set(collection, current + Number(item.price || 0) * Number(item.quantity || 0));
      }
    }

    const bestCollection = Array.from(collectionRevenue.entries()).sort((a, b) => b[1] - a[1])[0]?.[0] ?? "Atelier 01";
    const criticalStockCount = products.filter((product) => product.stock < 5).length;
    const pendingReview = reviews.find((review) => review.status === "pending");

    const now = new Date();
    const dayKeys = Array.from({ length: 30 }).map((_, idx) => {
      const date = new Date(now);
      date.setHours(0, 0, 0, 0);
      date.setDate(now.getDate() - (29 - idx));
      return date;
    });

    const salesByDay = new Map<string, number>();
    const soldItemsByDay = new Map<string, Array<{ name: string; quantity: number; amount: number; orderId: string }>>();
    for (const order of orders) {
      if (!paidStatuses.has(order.status)) continue;
      const orderDate = new Date(order.createdAt);
      if (Number.isNaN(orderDate.getTime())) continue;
      const key = `${orderDate.getFullYear()}-${orderDate.getMonth()}-${orderDate.getDate()}`;
      salesByDay.set(key, (salesByDay.get(key) ?? 0) + Number(order.total || 0));
      const dayItems = soldItemsByDay.get(key) ?? [];
      for (const item of order.items) {
        dayItems.push({
          name: item.name,
          quantity: Number(item.quantity || 0),
          amount: Number(item.price || 0) * Number(item.quantity || 0),
          orderId: order._id,
        });
      }
      soldItemsByDay.set(key, dayItems);
    }

    const salesTrend = dayKeys.map((date) => {
      const key = `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
      return { date: toShortDate(date), key, total: salesByDay.get(key) ?? 0 };
    });

    const pieData = collections.map((collection) => ({
      name: collection,
      value: collectionRevenue.get(collection) ?? 0,
    }));
    const pieTotal = pieData.reduce((sum, item) => sum + item.value, 0);

    const recentActivity = [
      ...(pendingReview
        ? [
            {
              id: `review-${pendingReview.id}`,
              type: "Yorum",
              title: "Yeni bir yorum onay bekliyor",
              subtitle: `${pendingReview.userName} • ${pendingReview.productName ?? "Ürün"} • ${pendingReview.rating}/5`,
              createdAt: pendingReview.createdAt,
              className: "border-amber-400/35 bg-amber-500/10 text-amber-100",
            },
          ]
        : []),
      ...orders
        .slice(0, 7)
        .map((order) => ({
          id: `order-${order._id}`,
          type: "Sipariş",
          title: `#${order._id} • ${order.shipping.fullName}`,
          subtitle: `${statusLabel(order.status)} • ${Number(order.total || 0).toLocaleString("tr-TR")} TL`,
          createdAt: order.createdAt,
          className: statusClass(order.status),
        })),
      ...products
        .filter((product) => product.stock < 5)
        .slice(0, 5)
        .map((product) => ({
          id: `stock-${product.id}`,
          type: "Stok",
          title: `${product.name} kritik stok`,
          subtitle: `Kalan stok: ${product.stock} • ${product.collection}`,
          createdAt: new Date().toISOString(),
          className: "border-amber-400/35 bg-amber-500/10 text-amber-200",
        })),
    ]
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 10);

    return {
      totalSales,
      pendingPayments: pendingPayments.reduce((sum, order) => sum + Number(order.total || 0), 0),
      pendingCount: pendingPayments.length,
      bestCollection,
      criticalStockCount,
      salesTrend,
      pieData,
      pieTotal,
      recentActivity,
      soldItemsByDay,
    };
  }, [orders, products, reviews]);

  const selectedDayDetails = useMemo(() => {
    if (!selectedDay) return null;
    const label = analytics.salesTrend.find((day) => day.key === selectedDay)?.date ?? null;
    const items = analytics.soldItemsByDay.get(selectedDay) ?? [];
    return { label, items };
  }, [analytics.salesTrend, analytics.soldItemsByDay, selectedDay]);

  return (
    <section className="mx-auto w-full max-w-7xl px-4 py-10 md:px-8">
      <div className="mb-6 rounded-3xl border border-[#D4AF37]/25 bg-[linear-gradient(140deg,rgba(212,175,55,0.14),rgba(12,12,12,0.9)_38%)] p-6 shadow-[0_18px_45px_rgba(0,0,0,0.34)]">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-xs tracking-[0.24em] uppercase text-[#D4AF37]">Admin Dashboard</p>
            <h1 className="mt-2 text-3xl font-semibold tracking-[0.18em] uppercase text-zinc-100">Operasyon Genel Bakış</h1>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link href="/admin/orders" className="rounded-xl border border-[#D4AF37]/45 bg-black/30 px-4 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-[#D4AF37] transition hover:shadow-[0_0_16px_rgba(212,175,55,0.32)]">Order Center</Link>
            <Link href="/admin/products" className="rounded-xl border border-[#D4AF37]/45 bg-black/30 px-4 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-[#D4AF37] transition hover:shadow-[0_0_16px_rgba(212,175,55,0.32)]">Envanter</Link>
            <Link href="/admin/coupons" className="rounded-xl border border-[#D4AF37]/45 bg-black/30 px-4 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-[#D4AF37] transition hover:shadow-[0_0_16px_rgba(212,175,55,0.32)]">Kuponlar</Link>
            <Link href="/admin/subscribers" className="rounded-xl border border-[#D4AF37]/45 bg-black/30 px-4 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-[#D4AF37] transition hover:shadow-[0_0_16px_rgba(212,175,55,0.32)]">Aboneler</Link>
            <Link href="/admin/reviews" className="rounded-xl border border-[#D4AF37]/45 bg-black/30 px-4 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-[#D4AF37] transition hover:shadow-[0_0_16px_rgba(212,175,55,0.32)]">Yorumlar</Link>
            <Link href="/admin/panel" className="rounded-xl border border-[#D4AF37]/45 bg-black/30 px-4 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-[#D4AF37] transition hover:shadow-[0_0_16px_rgba(212,175,55,0.32)]">Legacy Panel</Link>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="rounded-2xl border border-[#D4AF37]/20 bg-zinc-900/60 p-6 text-zinc-300">Yükleniyor...</div>
      ) : error ? (
        <div className="rounded-2xl border border-red-400/35 bg-red-950/20 p-6 text-red-200">{error}</div>
      ) : (
        <>
          <div className="mb-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <article className="rounded-2xl border border-[#D4AF37]/25 bg-zinc-900/70 p-5 backdrop-blur">
              <p className="text-xs tracking-[0.2em] uppercase text-zinc-400">Toplam Satış (TL)</p>
              <p className="mt-2 text-3xl font-semibold text-[#F3D47B]">{analytics.totalSales.toLocaleString("tr-TR")} TL</p>
              <CircleDollarSign className="mt-3 h-5 w-5 text-[#D4AF37]" />
            </article>
            <article className="rounded-2xl border border-[#D4AF37]/25 bg-zinc-900/70 p-5 backdrop-blur">
              <p className="text-xs tracking-[0.2em] uppercase text-zinc-400">Bekleyen Ödemeler (IBAN)</p>
              <p className="mt-2 text-3xl font-semibold text-zinc-100">{analytics.pendingPayments.toLocaleString("tr-TR")} TL</p>
              <p className="mt-1 text-xs text-zinc-500">{analytics.pendingCount} sipariş</p>
            </article>
            <article className="rounded-2xl border border-[#D4AF37]/25 bg-zinc-900/70 p-5 backdrop-blur">
              <p className="text-xs tracking-[0.2em] uppercase text-zinc-400">En Popüler Koleksiyon</p>
              <p className="mt-2 text-3xl font-semibold text-zinc-100">{analytics.bestCollection}</p>
              <Layers className="mt-3 h-5 w-5 text-[#D4AF37]" />
            </article>
            <article className="rounded-2xl border border-[#D4AF37]/25 bg-zinc-900/70 p-5 backdrop-blur">
              <p className="text-xs tracking-[0.2em] uppercase text-zinc-400">Kritik Stok (&lt;5)</p>
              <p className="mt-2 text-3xl font-semibold text-amber-200">{analytics.criticalStockCount}</p>
              <AlertTriangle className="mt-3 h-5 w-5 text-amber-300" />
            </article>
          </div>

          <div className="mb-6 grid gap-6 xl:grid-cols-[1.6fr_1fr]">
            <div className="rounded-2xl border border-[#D4AF37]/20 bg-zinc-900/65 p-5">
              <div className="mb-4 flex items-center justify-between">
                <p className="text-xs tracking-[0.2em] uppercase text-[#D4AF37]">Son 30 Gün Satış Trendi</p>
                <ChartSpline className="h-5 w-5 text-[#D4AF37]" />
              </div>
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart
                    data={analytics.salesTrend}
                    onClick={(state) => {
                      const label = String((state as { activeLabel?: string | number | null } | null)?.activeLabel ?? "");
                      const matched = analytics.salesTrend.find((day) => day.date === label);
                      if (matched) {
                        setSelectedDay(matched.key);
                      }
                    }}
                  >
                    <defs>
                      <linearGradient id="salesFill" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#D4AF37" stopOpacity={0.45} />
                        <stop offset="95%" stopColor="#D4AF37" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <XAxis dataKey="date" tick={{ fill: "#a1a1aa", fontSize: 11 }} axisLine={{ stroke: "#3f3f46" }} tickLine={false} />
                    <YAxis tick={{ fill: "#a1a1aa", fontSize: 11 }} axisLine={{ stroke: "#3f3f46" }} tickLine={false} width={68} />
                    <Tooltip
                      cursor={{ stroke: "#D4AF37", strokeOpacity: 0.35 }}
                      contentStyle={{ background: "#09090b", border: "1px solid rgba(212,175,55,0.35)", borderRadius: 12, color: "#e4e4e7" }}
                      formatter={(value) => [`${Number(value ?? 0).toLocaleString("tr-TR")} TL`, "Satış"]}
                    />
                    <Area type="monotone" dataKey="total" stroke="#D4AF37" strokeWidth={2.2} fillOpacity={1} fill="url(#salesFill)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="rounded-2xl border border-[#D4AF37]/20 bg-zinc-900/65 p-5">
              <p className="mb-4 text-xs tracking-[0.2em] uppercase text-[#D4AF37]">Koleksiyon Dağılımı</p>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Tooltip
                      contentStyle={{ background: "#09090b", border: "1px solid rgba(212,175,55,0.35)", borderRadius: 12, color: "#e4e4e7" }}
                      formatter={(value) => [`${Number(value ?? 0).toLocaleString("tr-TR")} TL`, "Ciro"]}
                    />
                    <Pie data={analytics.pieData} dataKey="value" nameKey="name" innerRadius={52} outerRadius={86} paddingAngle={4}>
                      {analytics.pieData.map((_, index) => {
                        const palette = ["#D4AF37", "#f3d47b", "#8b5cf6", "#0ea5e9"];
                        return <Cell key={`cell-${index}`} fill={palette[index % palette.length]} />;
                      })}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="space-y-2">
                {analytics.pieData.map((item) => (
                  <div key={item.name} className="flex items-center justify-between rounded-lg border border-[#D4AF37]/15 bg-black/25 px-3 py-2 text-xs">
                    <span className="text-zinc-300">{item.name}</span>
                    <span className="text-[#F3D47B]">
                      {analytics.pieTotal > 0
                        ? `%${Math.round((item.value / analytics.pieTotal) * 100)}`
                        : "%0"}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-[#D4AF37]/20 bg-zinc-900/65 p-5">
            <div className="mb-4 flex items-center justify-between">
              <p className="text-xs tracking-[0.2em] uppercase text-[#D4AF37]">Recent Activity</p>
              <ClipboardList className="h-5 w-5 text-[#D4AF37]" />
            </div>
            {analytics.recentActivity.length === 0 ? (
              <p className="text-sm text-zinc-400">Henüz aktivite yok.</p>
            ) : (
              <ul className="space-y-2">
                {analytics.recentActivity.map((activity) => (
                  <li key={activity.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-[#D4AF37]/15 bg-black/25 px-3 py-2">
                    <div className="min-w-0">
                      <p className="truncate text-sm text-zinc-100">{activity.title}</p>
                      <p className="text-xs text-zinc-400">{activity.subtitle}</p>
                    </div>
                    <span className={`rounded-full border px-2.5 py-1 text-[11px] ${activity.className}`}>
                      {activity.type}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </>
      )}

      {selectedDayDetails && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4 py-6 backdrop-blur-sm">
          <div className="w-full max-w-2xl rounded-3xl border border-[#D4AF37]/25 bg-[linear-gradient(155deg,rgba(18,18,18,0.98),rgba(6,6,6,0.98))] p-6 shadow-[0_24px_70px_rgba(0,0,0,0.6)]">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-xs tracking-[0.2em] uppercase text-[#D4AF37]">Satış Detayı</p>
                <h2 className="mt-2 text-2xl font-semibold text-zinc-100">{selectedDayDetails.label}</h2>
              </div>
              <button
                type="button"
                onClick={() => setSelectedDay(null)}
                className="rounded-xl border border-[#D4AF37]/35 px-3 py-2 text-sm text-[#D4AF37] transition hover:bg-[#D4AF37]/10"
              >
                Kapat
              </button>
            </div>

            <div className="mt-5 max-h-[60vh] space-y-3 overflow-y-auto pr-1">
              {selectedDayDetails.items.length === 0 ? (
                <p className="rounded-2xl border border-[#D4AF37]/15 bg-black/25 p-4 text-zinc-400">
                  Bu gün için ürün verisi bulunamadı.
                </p>
              ) : (
                selectedDayDetails.items.map((item, index) => (
                  <div key={`${item.orderId}-${item.name}-${index}`} className="rounded-2xl border border-[#D4AF37]/15 bg-black/25 p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="font-medium text-zinc-100">{item.name}</p>
                        <p className="text-xs text-zinc-500">Sipariş #{item.orderId}</p>
                      </div>
                      <p className="text-sm text-[#F3D47B]">
                        {item.quantity} adet • {item.amount.toLocaleString("tr-TR")} TL
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      <div className="mt-6 rounded-2xl border border-[#D4AF37]/15 bg-zinc-900/60 p-4 md:hidden">
        <div className="mb-2 flex items-center gap-2 text-sm text-zinc-300">
          <PackageSearch className="h-4 w-4 text-[#D4AF37]" />
          Hızlı Geçiş
        </div>
        <div className="grid gap-2">
          <Link href="/admin/orders" className="rounded-lg border border-[#D4AF37]/30 px-3 py-2 text-xs text-zinc-200">Sipariş Yönetimi</Link>
          <Link href="/admin/products" className="rounded-lg border border-[#D4AF37]/30 px-3 py-2 text-xs text-zinc-200">Envanter</Link>
          <Link href="/admin/support-requests" className="rounded-lg border border-[#D4AF37]/30 px-3 py-2 text-xs text-zinc-200">Talepler</Link>
        </div>
      </div>
    </section>
  );
}
