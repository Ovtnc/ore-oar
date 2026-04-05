"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useAuth } from "@/components/auth-provider";
import { useCart } from "@/components/cart-provider";
import {
  FREE_SHIPPING_THRESHOLD,
  SHIPPING_FEE,
  calculateOrderTotalWithConfig,
} from "@/lib/shipping";

const PROGRESS_BAR_THRESHOLD = 2000;

export default function CartPage() {
  const { cart, detailedItems, total, removeFromCart, incrementItem, decrementItem, catalogLoaded } = useCart();
  const { isAuthenticated, loading: authLoading } = useAuth();
  const [shippingConfig, setShippingConfig] = useState({
    shippingFee: SHIPPING_FEE,
    freeShippingThreshold: FREE_SHIPPING_THRESHOLD,
  });

  useEffect(() => {
    let mounted = true;
    async function loadShippingConfig() {
      try {
        const response = await fetch("/api/settings/shipping", { cache: "no-store" });
        const data = (await response.json().catch(() => null)) as
          | { shippingFee?: number; freeShippingThreshold?: number }
          | null;
        if (!response.ok || !data || !mounted) return;
        setShippingConfig({
          shippingFee: Number(data.shippingFee ?? SHIPPING_FEE),
          freeShippingThreshold: Number(data.freeShippingThreshold ?? FREE_SHIPPING_THRESHOLD),
        });
      } catch {
        // Sessiz fallback
      }
    }
    void loadShippingConfig();
    return () => {
      mounted = false;
    };
  }, []);

  const { shippingFee, grandTotal, hasFreeShipping, freeShippingThreshold } = calculateOrderTotalWithConfig(
    total,
    shippingConfig,
  );
  const totalItems = detailedItems.reduce((sum, item) => sum + item.quantity, 0);
  const remainingForProgress = Math.max(0, PROGRESS_BAR_THRESHOLD - total);
  const progressPercent = Math.min(100, Math.round((total / PROGRESS_BAR_THRESHOLD) * 100));

  return (
    <section className="mx-auto w-full max-w-6xl px-4 py-10 md:px-8">
      <div className="mb-8 rounded-3xl border border-[#D4AF37]/25 bg-[linear-gradient(135deg,rgba(212,175,55,0.18),rgba(26,26,26,0.9)_34%,rgba(8,8,8,0.96))] p-6 shadow-[0_20px_50px_rgba(0,0,0,0.34)]">
        <h1 className="text-4xl font-semibold text-zinc-100">Sepet</h1>
        <p className="mt-2 text-sm text-zinc-300">Parçalarını kontrol et, adedi güncelle ve siparişi tamamla.</p>
        <div className="mt-5 grid gap-3 sm:grid-cols-3">
          <div className="rounded-2xl border border-[#D4AF37]/20 bg-black/35 p-3">
            <p className="text-xs tracking-[0.2em] text-[#D4AF37]">ÜRÜN ADEDİ</p>
            <p className="mt-1 text-2xl font-semibold text-zinc-100">{totalItems}</p>
          </div>
          <div className="rounded-2xl border border-[#D4AF37]/20 bg-black/35 p-3">
            <p className="text-xs tracking-[0.2em] text-[#D4AF37]">ARA TOPLAM</p>
            <p className="mt-1 text-2xl font-semibold text-zinc-100">{total.toLocaleString("tr-TR")} TL</p>
          </div>
          <div className="rounded-2xl border border-[#D4AF37]/20 bg-black/35 p-3">
            <p className="text-xs tracking-[0.2em] text-[#D4AF37]">KARGO</p>
            <p className="mt-1 text-2xl font-semibold text-zinc-100">
              {hasFreeShipping ? "Ücretsiz" : `${shippingFee.toLocaleString("tr-TR")} TL`}
            </p>
          </div>
        </div>

        <div className="mt-5 rounded-2xl border border-[#D4AF37]/22 bg-black/30 p-4">
          <div className="mb-2 flex items-center justify-between text-xs text-zinc-300">
            <span>
              {remainingForProgress > 0
                ? `Ücretsiz kargo için ${remainingForProgress.toLocaleString("tr-TR")} TL kaldı`
                : "Ücretsiz kargo hakkı kazanıldı"}
            </span>
            <span className="text-[#D4AF37]">%{progressPercent}</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-zinc-800/90">
            <div
              className="h-full rounded-full bg-[#D4AF37] transition-all duration-500"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
          <p className="mt-2 text-[11px] text-zinc-500">
            Baraj: {PROGRESS_BAR_THRESHOLD.toLocaleString("tr-TR")} TL
          </p>
        </div>
      </div>

      {detailedItems.length === 0 && cart.length > 0 && !catalogLoaded ? (
        <div className="lux-card p-8 text-zinc-300">Ürünler yükleniyor...</div>
      ) : detailedItems.length === 0 ? (
        <div className="lux-card p-8">
          <p className="text-zinc-300">Sepetiniz boş.</p>
          <Link href="/products" className="mt-4 inline-block text-[#D4AF37] hover:underline">
            Ürünlere göz at
          </Link>
        </div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
          <div className="space-y-4">
            {detailedItems.map((item) => (
              <article
                key={item.itemKey}
                className="grid gap-3 rounded-2xl border border-[#D4AF37]/20 bg-[linear-gradient(150deg,rgba(24,24,24,0.88),rgba(8,8,8,0.96))] p-4 shadow-[0_12px_30px_rgba(0,0,0,0.28)] sm:grid-cols-[120px_1fr_auto] sm:items-center"
              >
                <div className="relative h-24 overflow-hidden rounded-xl border border-[#D4AF37]/20 bg-black/35">
                  <Image
                    src={item.product.image || "/logo.png"}
                    alt={item.product.name}
                    fill
                    sizes="120px"
                    className="object-cover"
                    loading="lazy"
                    fetchPriority="low"
                  />
                </div>

                <div>
                  <p className="text-lg font-semibold text-zinc-100">{item.product.name}</p>
                  <p className="text-sm text-zinc-400">{item.product.category}</p>
                  {item.coatingOption && (
                    <p className="mt-1 text-xs text-zinc-300">
                      Kaplama: {item.coatingOption.name} (+{item.coatingOption.priceDelta.toLocaleString("tr-TR")} TL)
                    </p>
                  )}
                  <p className="mt-2 text-sm text-[#D4AF37]">
                    {item.unitPrice.toLocaleString("tr-TR")} TL × {item.quantity}
                  </p>
                  <p className="mt-1 text-xs text-zinc-400">
                    Ara Toplam: {(item.unitPrice * item.quantity).toLocaleString("tr-TR")} TL
                  </p>
                </div>

                <div className="flex items-center gap-2 sm:flex-col sm:items-end">
                  <div className="flex items-center gap-2 rounded-full border border-[#D4AF37]/30 bg-black/35 px-2 py-1">
                    <button
                      type="button"
                      onClick={() => decrementItem(item.itemKey)}
                      className="h-8 w-8 rounded-full border border-[#D4AF37]/40 text-zinc-200 transition hover:bg-[#D4AF37]/12"
                      aria-label={`${item.product.name} miktarını azalt`}
                    >
                      -
                    </button>
                    <span className="min-w-6 text-center text-sm">{item.quantity}</span>
                    <button
                      type="button"
                      onClick={() => incrementItem(item.itemKey)}
                      className="h-8 w-8 rounded-full border border-[#D4AF37]/40 text-zinc-200 transition hover:bg-[#D4AF37]/12"
                      aria-label={`${item.product.name} miktarını artır`}
                    >
                      +
                    </button>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeFromCart(item.itemKey)}
                    className="rounded-lg border border-red-400/40 px-3 py-1.5 text-xs text-red-300 transition hover:bg-red-500/10"
                  >
                    Kaldır
                  </button>
                </div>
              </article>
            ))}
          </div>

          <aside className="h-fit rounded-2xl border border-[#D4AF37]/25 bg-[linear-gradient(155deg,rgba(22,22,22,0.9),rgba(8,8,8,0.96))] p-5 lg:sticky lg:top-24">
            <p className="text-xs tracking-[0.2em] text-[#D4AF37]">SİPARİŞ ÖZETİ</p>
            <div className="mt-4 space-y-2 text-sm text-zinc-300">
              <div className="flex items-center justify-between">
                <span>Ara Toplam</span>
                <span>{total.toLocaleString("tr-TR")} TL</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Kargo</span>
                <span>{hasFreeShipping ? "Ücretsiz" : `${shippingFee.toLocaleString("tr-TR")} TL`}</span>
              </div>
              <div className="mt-3 border-t border-[#D4AF37]/20 pt-3 text-base font-semibold text-zinc-100">
                <div className="flex items-center justify-between">
                  <span>Toplam</span>
                  <span className="text-[#D4AF37]">{grandTotal.toLocaleString("tr-TR")} TL</span>
                </div>
              </div>
            </div>

            <div className="mt-4 space-y-1 rounded-xl border border-[#D4AF37]/20 bg-black/25 p-3 text-xs text-zinc-400">
              <p className="text-[#F3D47B]">
                {remainingForProgress > 0
                  ? `• Ücretsiz kargo için kalan: ${remainingForProgress.toLocaleString("tr-TR")} TL`
                  : "• Ücretsiz kargo barajı aşıldı."}
              </p>
              <p>
                {hasFreeShipping
                  ? "• Bu siparişte kargo ücretsiz."
                  : `• ${freeShippingThreshold.toLocaleString("tr-TR")} TL ve üzeri kargo ücretsiz.`}
              </p>
              <p>• Güvenli banka havalesi ile ödeme</p>
              <p>• Siparişe özel üretim ve kalite kontrol</p>
              <p>• Ödeme sonrası atölye süreci bilgilendirmesi</p>
            </div>

            {authLoading ? (
              <div className="mt-5 rounded-lg border border-[#D4AF37]/20 px-4 py-3 text-center text-sm text-zinc-400">
                Hesap kontrol ediliyor...
              </div>
            ) : isAuthenticated ? (
              <Link
                href="/checkout"
                className="mt-5 inline-flex w-full items-center justify-center rounded-lg border border-[#D4AF37] bg-[#D4AF37] px-5 py-3 text-sm font-semibold text-black transition hover:bg-transparent hover:text-[#D4AF37]"
              >
                Ödemeye Geç
              </Link>
            ) : (
              <Link
                href="/login?next=/checkout"
                className="mt-5 inline-flex w-full items-center justify-center rounded-lg border border-[#D4AF37] bg-[#D4AF37] px-5 py-3 text-sm font-semibold text-black transition hover:bg-transparent hover:text-[#D4AF37]"
              >
                Sipariş İçin Giriş Yap
              </Link>
            )}

            {isAuthenticated && (
              <Link href="/orders" className="mt-3 inline-block text-xs text-[#D4AF37] hover:underline">
                Siparişlerimi görüntüle →
              </Link>
            )}
          </aside>
        </div>
      )}
    </section>
  );
}
