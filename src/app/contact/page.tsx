"use client";

import Link from "next/link";
import { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useAuth } from "@/components/auth-provider";
import { Order } from "@/lib/types";

type UserOrder = Order & { _id: string };

type ProductSelection = {
  key: string;
  productId: string;
  productName: string;
  productVariant?: string;
};

function toId(value: unknown, fallback: string) {
  if (typeof value === "string") return value;
  if (value && typeof value === "object" && "toString" in value) {
    const parsed = (value as { toString: () => string }).toString();
    if (parsed && parsed !== "[object Object]") return parsed;
  }
  return fallback;
}

function subjectOptions() {
  return [
    "Ödeme kontrolü",
    "Kargo ve teslimat",
    "Ürün hasarı / değişim",
    "İptal / iade talebi",
    "Diğer",
  ];
}

function ContactPageClient() {
  const searchParams = useSearchParams();
  const { isAuthenticated, loading: authLoading } = useAuth();

  const [orders, setOrders] = useState<UserOrder[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [orderId, setOrderId] = useState("");
  const [productKey, setProductKey] = useState("");
  const [subject, setSubject] = useState(subjectOptions()[0]);
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [successId, setSuccessId] = useState<string | null>(null);

  useEffect(() => {
    if (authLoading || !isAuthenticated) return;
    let mounted = true;

    async function loadOrders() {
      setLoadingOrders(true);
      setError(null);
      try {
        const response = await fetch("/api/orders", { cache: "no-store" });
        if (!response.ok) {
          throw new Error("Siparişler yüklenemedi.");
        }
        const data = (await response.json()) as Order[];
        if (!mounted) return;
        const normalized = data.map((order, index) => ({
          ...order,
          _id: toId(order._id, `order-${index}`),
        }));
        setOrders(normalized);
      } catch (err) {
        if (!mounted) return;
        setError(err instanceof Error ? err.message : "Siparişler yüklenemedi.");
      } finally {
        if (!mounted) return;
        setLoadingOrders(false);
      }
    }

    void loadOrders();
    return () => {
      mounted = false;
    };
  }, [authLoading, isAuthenticated]);

  useEffect(() => {
    if (orders.length === 0) return;

    const queryOrderId = String(searchParams.get("orderId") ?? "").trim();
    const queryProductId = String(searchParams.get("productId") ?? "").trim();

    const resolvedOrderId = orders.some((order) => order._id === queryOrderId)
      ? queryOrderId
      : orders[0]._id;

    setOrderId((prev) => prev || resolvedOrderId);

    if (queryProductId) {
      const matchedOrder = orders.find((order) => order._id === resolvedOrderId);
      const matchedItem = matchedOrder?.items.find((item) => item.productId === queryProductId);
      if (matchedItem) {
        const key = `${matchedItem.productId}::${matchedItem.name}::${matchedItem.coatingName ?? ""}`;
        setProductKey((prev) => prev || key);
        return;
      }
    }

    const firstOrder = orders.find((order) => order._id === resolvedOrderId);
    if (firstOrder?.items?.[0]) {
      const item = firstOrder.items[0];
      const key = `${item.productId}::${item.name}::${item.coatingName ?? ""}`;
      setProductKey((prev) => prev || key);
    }
  }, [orders, searchParams]);

  const selectedOrder = useMemo(
    () => orders.find((order) => order._id === orderId) ?? null,
    [orders, orderId],
  );

  const productSelections = useMemo<ProductSelection[]>(() => {
    if (!selectedOrder) return [];
    return selectedOrder.items.map((item) => ({
      key: `${item.productId}::${item.name}::${item.coatingName ?? ""}`,
      productId: item.productId,
      productName: item.name,
      productVariant: item.coatingName || undefined,
    }));
  }, [selectedOrder]);

  useEffect(() => {
    if (productSelections.length === 0) {
      setProductKey("");
      return;
    }
    if (!productSelections.some((item) => item.key === productKey)) {
      setProductKey(productSelections[0].key);
    }
  }, [productSelections, productKey]);

  const selectedProduct = useMemo(
    () => productSelections.find((item) => item.key === productKey) ?? null,
    [productSelections, productKey],
  );

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSuccessId(null);
    setError(null);

    if (!orderId || !selectedProduct) {
      setError("Lütfen sipariş ve ürün seçin.");
      return;
    }

    setSending(true);
    try {
      const response = await fetch("/api/support-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderId,
          productId: selectedProduct.productId,
          productName: selectedProduct.productName,
          productVariant: selectedProduct.productVariant,
          subject,
          message,
        }),
      });

      const data = (await response.json().catch(() => null)) as { requestId?: string; error?: string } | null;
      if (!response.ok) {
        throw new Error(data?.error ?? "Talep gönderilemedi.");
      }

      setSuccessId(data?.requestId ?? "");
      setMessage("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Talep gönderilemedi.");
    } finally {
      setSending(false);
    }
  }

  if (authLoading || loadingOrders) {
    return (
      <section className="mx-auto w-full max-w-3xl px-4 py-10 md:px-8">
        <div className="rounded-2xl border border-[#D4AF37]/25 bg-zinc-900/60 p-6 text-zinc-300">Yükleniyor...</div>
      </section>
    );
  }

  if (!isAuthenticated) {
    return (
      <section className="mx-auto w-full max-w-3xl px-4 py-10 md:px-8">
        <div className="rounded-2xl border border-[#D4AF37]/25 bg-zinc-900/60 p-6">
          <h1 className="text-3xl font-semibold text-zinc-100">İletişim</h1>
          <p className="mt-3 text-zinc-300">Siparişle ilgili talep açmak için giriş yapmalısın.</p>
          <Link
            href="/login?next=/contact"
            className="mt-4 inline-flex rounded-lg border border-[#D4AF37] bg-[#D4AF37] px-4 py-2 text-sm font-semibold text-black"
          >
            Giriş Yap
          </Link>
        </div>
      </section>
    );
  }

  return (
    <section className="mx-auto w-full max-w-3xl px-4 py-10 md:px-8">
      <div className="rounded-2xl border border-[#D4AF37]/30 bg-[linear-gradient(150deg,rgba(212,175,55,0.12),rgba(14,14,14,0.9)_35%)] p-6">
        <p className="text-xs tracking-[0.24em] text-[#D4AF37]">DESTEK MERKEZİ</p>
        <h1 className="mt-2 text-3xl font-semibold text-zinc-100">İletişim</h1>
        <p className="mt-2 text-sm text-zinc-300">
          Siparişinle ilgili sorunu seç, talebin hem admin panele hem bildirim e-postalarına düşsün.
        </p>
      </div>

      <form onSubmit={onSubmit} className="mt-5 space-y-4 rounded-2xl border border-[#D4AF37]/25 bg-zinc-900/60 p-6">
        <div className="grid gap-4 md:grid-cols-2">
          <label className="text-sm text-zinc-300">
            Sipariş
            <select
              value={orderId}
              onChange={(event) => setOrderId(event.target.value)}
              className="mt-2 w-full rounded-xl border border-[#D4AF37]/25 bg-black/35 px-3 py-2 text-sm text-zinc-100 outline-none transition focus:border-[#D4AF37]"
              required
            >
              {orders.map((order) => (
                <option key={order._id} value={order._id}>
                  #{order._id} • {new Date(order.createdAt).toLocaleDateString("tr-TR")}
                </option>
              ))}
            </select>
          </label>

          <label className="text-sm text-zinc-300">
            Ürün
            <select
              value={productKey}
              onChange={(event) => setProductKey(event.target.value)}
              className="mt-2 w-full rounded-xl border border-[#D4AF37]/25 bg-black/35 px-3 py-2 text-sm text-zinc-100 outline-none transition focus:border-[#D4AF37]"
              required
            >
              {productSelections.map((product) => (
                <option key={product.key} value={product.key}>
                  {product.productName}
                  {product.productVariant ? ` (${product.productVariant})` : ""}
                </option>
              ))}
            </select>
          </label>
        </div>

        <label className="block text-sm text-zinc-300">
          Konu
          <select
            value={subject}
            onChange={(event) => setSubject(event.target.value)}
            className="mt-2 w-full rounded-xl border border-[#D4AF37]/25 bg-black/35 px-3 py-2 text-sm text-zinc-100 outline-none transition focus:border-[#D4AF37]"
            required
          >
            {subjectOptions().map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </label>

        <label className="block text-sm text-zinc-300">
          Mesajın
          <textarea
            value={message}
            onChange={(event) => setMessage(event.target.value)}
            rows={6}
            minLength={10}
            required
            placeholder="Sorunu kısaca ama net biçimde yaz. Örn: ödeme yaptım ama onaylanmadı."
            className="mt-2 w-full rounded-xl border border-[#D4AF37]/25 bg-black/35 px-3 py-2 text-sm text-zinc-100 outline-none transition focus:border-[#D4AF37]"
          />
        </label>

        {error && <div className="rounded-xl border border-red-400/35 bg-red-950/20 p-3 text-sm text-red-200">{error}</div>}
        {successId && (
          <div className="rounded-xl border border-emerald-400/35 bg-emerald-950/20 p-3 text-sm text-emerald-200">
            Talebin alındı. Talep No: #{successId}
          </div>
        )}

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="submit"
            disabled={sending || orders.length === 0}
            className="rounded-lg border border-[#D4AF37] bg-[#D4AF37] px-4 py-2 text-sm font-semibold text-black transition hover:bg-transparent hover:text-[#D4AF37] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {sending ? "Gönderiliyor..." : "Talep Oluştur"}
          </button>
          <Link href="/orders" className="text-sm text-[#D4AF37] hover:underline">
            Siparişlerime dön
          </Link>
        </div>
      </form>
    </section>
  );
}

export default function ContactPage() {
  return (
    <Suspense
      fallback={
        <section className="mx-auto w-full max-w-3xl px-4 py-10 md:px-8">
          <div className="rounded-2xl border border-[#D4AF37]/25 bg-zinc-900/60 p-6 text-zinc-300">Yükleniyor...</div>
        </section>
      }
    >
      <ContactPageClient />
    </Suspense>
  );
}
