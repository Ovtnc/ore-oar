"use client";

import Image from "next/image";
import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/auth-provider";
import { useCart } from "@/components/cart-provider";
import {
  FREE_SHIPPING_THRESHOLD,
  SHIPPING_FEE,
  calculateOrderTotalWithConfig,
} from "@/lib/shipping";

type CheckoutField = {
  name: string;
  label: string;
  type: string;
  required: boolean;
  autoComplete: string;
  placeholder: string;
  minLength?: number;
  pattern?: string;
};

const fields: CheckoutField[] = [
  {
    name: "fullName",
    label: "Ad Soyad",
    type: "text",
    required: true,
    autoComplete: "name",
    placeholder: "Ad Soyad",
    minLength: 2,
  },
  {
    name: "phone",
    label: "Telefon",
    type: "tel",
    required: true,
    autoComplete: "tel",
    placeholder: "05xx xxx xx xx",
    pattern: "^[0-9+\\s()\\-]{10,20}$",
  },
  {
    name: "address",
    label: "Adres",
    type: "text",
    required: true,
    autoComplete: "street-address",
    placeholder: "Mahalle, sokak, bina, daire",
    minLength: 10,
  },
  {
    name: "city",
    label: "Şehir",
    type: "text",
    required: true,
    autoComplete: "address-level2",
    placeholder: "Şehir",
  },
  {
    name: "postalCode",
    label: "Posta Kodu (Opsiyonel)",
    type: "text",
    required: false,
    autoComplete: "postal-code",
    placeholder: "34000",
    pattern: "^$|^[0-9]{5}$",
  },
] as const;

export default function CheckoutPage() {
  const { cart, detailedItems, total, clearCart, catalogLoaded } = useCart();
  const { user, isAuthenticated, loading: authLoading } = useAuth();
  const router = useRouter();
  const [shippingConfig, setShippingConfig] = useState({
    shippingFee: SHIPPING_FEE,
    freeShippingThreshold: FREE_SHIPPING_THRESHOLD,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { shippingFee, grandTotal, hasFreeShipping, freeShippingThreshold } = calculateOrderTotalWithConfig(
    total,
    shippingConfig,
  );

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

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!isAuthenticated) {
      setError("Sipariş verebilmek için önce giriş yapmalısın.");
      return;
    }
    if (detailedItems.length === 0) return;
    setLoading(true);
    setError(null);

    const formData = new FormData(event.currentTarget);
    const payload = {
      shipping: {
        fullName: String(formData.get("fullName") ?? "").trim(),
        email: user?.email ?? "",
        phone: String(formData.get("phone") ?? ""),
        address: String(formData.get("address") ?? "").trim(),
        city: String(formData.get("city") ?? "").trim(),
        postalCode: String(formData.get("postalCode") ?? ""),
        country: "Türkiye",
      },
      items: detailedItems.map((item) => ({
        productId: item.product.id,
        name: item.product.name,
        price: item.unitPrice,
        quantity: item.quantity,
        coatingOptionId: item.coatingOption?.id,
        coatingName: item.coatingOption?.name,
        coatingPriceDelta: item.coatingOption?.priceDelta ?? 0,
      })),
      customerNote: String(formData.get("customerNote") ?? "").trim(),
      total: grandTotal,
    };

    try {
      const response = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = (await response.json()) as { orderId?: string; error?: string };
      if (!response.ok || !data.orderId) {
        setError(data.error ?? "Sipariş oluşturulamadı. Lütfen tekrar deneyin.");
        if (response.status === 401) {
          router.push("/login?next=/checkout");
        }
        return;
      }

      clearCart();
      router.push(`/payment?orderId=${data.orderId}`);
    } catch {
      setError("Sipariş gönderilirken bir hata oluştu.");
    } finally {
      setLoading(false);
    }
  }

  if (cart.length > 0 && !catalogLoaded && detailedItems.length === 0) {
    return (
      <section className="mx-auto w-full max-w-3xl px-4 py-10 md:px-8">
        <div className="lux-card p-6 text-zinc-300">Ürünler yükleniyor...</div>
      </section>
    );
  }

  if (authLoading) {
    return (
      <section className="mx-auto w-full max-w-3xl px-4 py-10 md:px-8">
        <div className="lux-card p-6 text-zinc-300">Hesap doğrulanıyor...</div>
      </section>
    );
  }

    if (!isAuthenticated) {
      return (
        <section className="mx-auto w-full max-w-3xl px-4 py-10 md:px-8">
        <div className="lux-card p-8">
          <h1 className="text-3xl font-semibold text-zinc-100">Teslimat Bilgileri</h1>
          <p className="mt-3 text-zinc-300">
            Sipariş verebilmek için üyelik girişi yapman gerekiyor.
          </p>
          <div className="mt-5 flex flex-wrap gap-3">
            <Link
              href="/login?next=/checkout"
              className="rounded-lg border border-[#D4AF37] bg-[#D4AF37] px-4 py-2 text-sm font-semibold text-black"
            >
              Giriş Yap
            </Link>
            <Link
              href="/signup?next=/checkout"
              className="rounded-lg border border-[#D4AF37]/35 px-4 py-2 text-sm text-[#D4AF37]"
            >
              Hesap Oluştur
            </Link>
          </div>
        </div>
      </section>
    );
  }

  if (detailedItems.length === 0) {
    return (
      <section className="mx-auto w-full max-w-3xl px-4 py-10 md:px-8">
        <div className="lux-card p-8">
          <h1 className="text-3xl font-semibold text-zinc-100">Teslimat Bilgileri</h1>
          <p className="mt-3 text-zinc-300">Sepetinizde ürün bulunmuyor.</p>
          <Link href="/products" className="mt-4 inline-block text-[#D4AF37] hover:underline">
            Ürünlere dön
          </Link>
        </div>
      </section>
    );
  }

  return (
    <section className="mx-auto w-full max-w-6xl px-4 py-10 md:px-8">
      <h1 className="text-4xl font-semibold text-zinc-100">Teslimat Bilgileri</h1>
      <p className="mt-2 text-zinc-400">Sadece gerekli teslimat bilgilerini doldurun, siparişinizi ödeme adımına taşıyalım.</p>
      <p className="mt-1 text-sm text-zinc-500">Sipariş e-postası: {user?.email}</p>

      <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_340px]">
        <form onSubmit={onSubmit} className="space-y-4 rounded-2xl border border-[#D4AF37]/25 bg-zinc-900/55 p-6">
          <div className="grid gap-3 md:grid-cols-2">
            {fields.map((field) => (
              <label key={field.name} className={`block text-sm ${field.name === "address" ? "md:col-span-2" : ""}`}>
                <span className="mb-1 block text-zinc-300">{field.label}</span>
                <input
                  required={field.required}
                  name={field.name}
                  type={field.type}
                  autoComplete={field.autoComplete}
                  placeholder={field.placeholder}
                  minLength={field.minLength}
                  pattern={field.pattern}
                  className="w-full rounded-lg border border-[#D4AF37]/25 bg-black/40 px-3 py-2 outline-none focus:border-[#D4AF37]"
                />
              </label>
            ))}
          </div>

          <label className="block text-sm">
            <span className="mb-1 block text-zinc-300">Sipariş Mesajı (Opsiyonel)</span>
            <textarea
              name="customerNote"
              placeholder="Örn: Kapı zilim bozuk, lütfen telefonla arayın."
              maxLength={400}
              rows={3}
              className="w-full rounded-lg border border-[#D4AF37]/25 bg-black/40 px-3 py-2 outline-none focus:border-[#D4AF37]"
            />
          </label>

          {error && <div className="rounded-lg border border-red-400/30 bg-red-950/20 p-3 text-sm text-red-200">{error}</div>}

          <button
            type="submit"
            disabled={loading}
            className="rounded-lg border border-[#D4AF37] bg-[#D4AF37] px-5 py-3 text-sm font-semibold text-black transition disabled:opacity-45"
          >
            {loading ? "Sipariş oluşturuluyor..." : "Ödeme Adımına Geç"}
          </button>
        </form>

        <aside className="h-fit rounded-2xl border border-[#D4AF37]/25 bg-black/35 p-5 lg:sticky lg:top-24">
          <p className="text-xs tracking-[0.2em] text-[#D4AF37]">SİPARİŞ ÖZETİ</p>

          <div className="mt-4 space-y-3">
            {detailedItems.map((item) => (
              <div key={item.itemKey} className="grid grid-cols-[52px_1fr] gap-3">
                <div className="relative h-12 overflow-hidden rounded border border-[#D4AF37]/20 bg-black/30">
                  <Image
                    src={item.product.image || "/logo.png"}
                    alt={item.product.name}
                    fill
                    sizes="52px"
                    className="object-contain p-1"
                    unoptimized
                  />
                </div>
                <div className="text-sm">
                  <p className="truncate text-zinc-100">{item.product.name}</p>
                  {item.coatingOption && (
                    <p className="text-xs text-zinc-300">
                      Kaplama: {item.coatingOption.name}
                    </p>
                  )}
                  <p className="text-zinc-400">
                    {item.quantity} × {item.unitPrice.toLocaleString("tr-TR")} TL
                  </p>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-5 border-t border-[#D4AF37]/20 pt-4 text-sm">
            <div className="flex items-center justify-between text-zinc-300">
              <span>Ara Toplam</span>
              <span>{total.toLocaleString("tr-TR")} TL</span>
            </div>
            <div className="mt-2 flex items-center justify-between text-zinc-300">
              <span>Kargo</span>
              <span>{hasFreeShipping ? "Ücretsiz" : `${shippingFee.toLocaleString("tr-TR")} TL`}</span>
            </div>
            <p className="mt-2 text-xs text-zinc-500">
              {hasFreeShipping
                ? "Kargo bu siparişte ücretsiz."
                : `${freeShippingThreshold.toLocaleString("tr-TR")} TL ve üzeri siparişlerde kargo ücretsiz.`}
            </p>
            <div className="mt-2 flex items-center justify-between font-semibold text-zinc-100">
              <span>Toplam</span>
              <span className="text-[#D4AF37]">{grandTotal.toLocaleString("tr-TR")} TL</span>
            </div>
          </div>
        </aside>
      </div>
    </section>
  );
}
