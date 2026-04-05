"use client";

import Image from "next/image";
import { FormEvent, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/auth-provider";
import { useCart } from "@/components/cart-provider";
import { trackBeginCheckout, trackPurchase } from "@/lib/analytics";
import { Coupon } from "@/lib/types";
import {
  FREE_SHIPPING_THRESHOLD,
  SHIPPING_FEE,
  calculateOrderTotalWithConfig,
} from "@/lib/shipping";

type CheckoutField = {
  name: ShippingFieldName;
  label: string;
  type: string;
  required: boolean;
  autoComplete: string;
  placeholder: string;
  minLength?: number;
};

type ShippingFieldName = "fullName" | "phone" | "address" | "city" | "postalCode";

type CheckoutFormState = {
  fullName: string;
  phone: string;
  address: string;
  city: string;
  postalCode: string;
  giftNote: string;
  isGift: boolean;
  couponCode: string;
};

const EMPTY_FIELD_ERRORS: Record<ShippingFieldName, string> = {
  fullName: "",
  phone: "",
  address: "",
  city: "",
  postalCode: "",
};

function applyTrPhoneMask(input: string) {
  let digits = input.replace(/\D/g, "");
  if (digits.startsWith("90")) digits = digits.slice(2);
  if (digits && !digits.startsWith("0")) digits = `0${digits}`;
  digits = digits.slice(0, 11);

  const parts = [digits.slice(0, 4), digits.slice(4, 7), digits.slice(7, 9), digits.slice(9, 11)].filter(Boolean);
  return parts.join(" ");
}

function normalizePhoneForPayload(value: string) {
  return value.replace(/\D/g, "");
}

function applyPostalCodeMask(input: string) {
  return input.replace(/\D/g, "").slice(0, 5);
}

function validateShippingField(name: ShippingFieldName, value: string) {
  const text = value.trim();

  if (name === "fullName") {
    if (text.length < 2) return "Ad soyad en az 2 karakter olmalı.";
    return "";
  }

  if (name === "phone") {
    const digits = normalizePhoneForPayload(value);
    if (!/^05\d{9}$/.test(digits)) return "Telefon 05xx xxx xx xx formatında olmalı.";
    return "";
  }

  if (name === "address") {
    if (text.length < 10) return "Adres en az 10 karakter olmalı.";
    return "";
  }

  if (name === "city") {
    if (text.length < 2) return "Şehir en az 2 karakter olmalı.";
    return "";
  }

  if (name === "postalCode") {
    if (text.length > 0 && !/^\d{5}$/.test(text)) {
      return "Posta kodu 5 haneli olmalı.";
    }
    return "";
  }

  return "";
}

function validateShippingForm(values: CheckoutFormState) {
  return {
    fullName: validateShippingField("fullName", values.fullName),
    phone: validateShippingField("phone", values.phone),
    address: validateShippingField("address", values.address),
    city: validateShippingField("city", values.city),
    postalCode: validateShippingField("postalCode", values.postalCode),
  } satisfies Record<ShippingFieldName, string>;
}

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
  const [form, setForm] = useState<CheckoutFormState>({
    fullName: "",
    phone: "",
    address: "",
    city: "",
    postalCode: "",
    giftNote: "",
    isGift: false,
    couponCode: "",
  });
  const [couponState, setCouponState] = useState<{
    loading: boolean;
    valid: boolean;
    discountAmount: number;
    code: string;
    message: string | null;
    coupon: Coupon | null;
  }>({
    loading: false,
    valid: false,
    discountAmount: 0,
    code: "",
    message: null,
    coupon: null,
  });
  const [fieldErrors, setFieldErrors] = useState<Record<ShippingFieldName, string>>(EMPTY_FIELD_ERRORS);
  const [touched, setTouched] = useState<Record<ShippingFieldName, boolean>>({
    fullName: false,
    phone: false,
    address: false,
    city: false,
    postalCode: false,
  });
  const [submitAttempted, setSubmitAttempted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const hasTrackedBeginCheckoutRef = useRef(false);
  const couponDiscountAmount = couponState.valid ? couponState.discountAmount : 0;
  const effectiveSubtotal = Math.max(0, total - couponDiscountAmount);
  const orderTotals = calculateOrderTotalWithConfig(effectiveSubtotal, shippingConfig);
  const { shippingFee, grandTotal, hasFreeShipping, freeShippingThreshold } = orderTotals;

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

  useEffect(() => {
    if (!user?.name) return;
    setForm((prev) => (prev.fullName ? prev : { ...prev, fullName: user.name }));
  }, [user?.name]);

  useEffect(() => {
    if (!form.isGift && form.giftNote) {
      setForm((prev) => ({ ...prev, giftNote: "" }));
    }
  }, [form.giftNote, form.isGift]);

  useEffect(() => {
    if (!isAuthenticated) return;
    if (detailedItems.length === 0) return;
    if (hasTrackedBeginCheckoutRef.current) return;

    trackBeginCheckout({
      items: detailedItems.map((item) => ({
        productId: item.product.id,
        price: item.unitPrice,
        quantity: item.quantity,
      })),
      totalValue: grandTotal,
    });
    hasTrackedBeginCheckoutRef.current = true;
  }, [detailedItems, grandTotal, isAuthenticated]);

  useEffect(() => {
    if (detailedItems.length === 0) {
      hasTrackedBeginCheckoutRef.current = false;
    }
  }, [detailedItems.length]);

  function handleFieldChange(field: ShippingFieldName, rawValue: string) {
    let nextValue = rawValue;
    if (field === "phone") {
      nextValue = applyTrPhoneMask(rawValue);
    } else if (field === "postalCode") {
      nextValue = applyPostalCodeMask(rawValue);
    }

    setForm((prev) => ({ ...prev, [field]: nextValue }));
    setFieldErrors((prev) => ({ ...prev, [field]: validateShippingField(field, nextValue) }));
  }

  function handleFieldBlur(field: ShippingFieldName) {
    setTouched((prev) => ({ ...prev, [field]: true }));
    setFieldErrors((prev) => ({ ...prev, [field]: validateShippingField(field, form[field]) }));
  }

  async function applyCouponCode(rawCode?: string) {
    const code = String(rawCode ?? form.couponCode).trim().toUpperCase();
    if (!code) {
      setCouponState({
        loading: false,
        valid: false,
        discountAmount: 0,
        code: "",
        message: null,
        coupon: null,
      });
      return null;
    }

    setCouponState((prev) => ({ ...prev, loading: true, code }));
    try {
      const response = await fetch("/api/apply-coupon", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code,
          items: detailedItems.map((item) => ({
            productId: item.product.id,
            price: item.unitPrice,
            quantity: item.quantity,
          })),
        }),
      });
      const data = (await response.json().catch(() => null)) as
        | {
            valid?: boolean;
            coupon?: Coupon | null;
            discountAmount?: number;
            message?: string;
            error?: string;
          }
        | null;
      if (!response.ok || !data?.valid || !data.coupon) {
        const nextState = {
          loading: false,
          valid: false,
          discountAmount: 0,
          code,
          message: data?.message ?? "Kupon geçersiz veya süresi dolmuş.",
          coupon: null,
        };
        setCouponState(nextState);
        return nextState;
      }

      const nextState = {
        loading: false,
        valid: true,
        discountAmount: Number(data.discountAmount ?? 0),
        code: String(data.coupon.code ?? code),
        message: data.message ?? `${String(data.coupon.code ?? code)} kuponu uygulandı.`,
        coupon: data.coupon ?? null,
      };
      setCouponState(nextState);
      setForm((prev) => ({ ...prev, couponCode: code }));
      return nextState;
    } catch {
      const nextState = {
        loading: false,
        valid: false,
        discountAmount: 0,
        code,
        message: "Kupon doğrulanamadı.",
        coupon: null,
      };
      setCouponState(nextState);
      return nextState;
    }
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!isAuthenticated) {
      setError("Sipariş verebilmek için önce giriş yapmalısın.");
      return;
    }
    if (detailedItems.length === 0) return;

    setSubmitAttempted(true);
    const nextErrors = validateShippingForm(form);
    setFieldErrors(nextErrors);
    const hasErrors = Object.values(nextErrors).some(Boolean);
    if (hasErrors) {
      setError("Lütfen teslimat formundaki hatalı alanları düzeltin.");
      return;
    }

    let nextCouponState = couponState;
    if (form.couponCode.trim() && (!couponState.valid || couponState.code !== form.couponCode.trim().toUpperCase())) {
      nextCouponState = (await applyCouponCode(form.couponCode)) ?? nextCouponState;
      if (!nextCouponState.valid) {
        setError(nextCouponState.message ?? "Kupon uygulanamadı.");
        setLoading(false);
        return;
      }
    }

    const appliedDiscountAmount = nextCouponState.valid ? nextCouponState.discountAmount : couponDiscountAmount;
    const appliedSubtotal = Math.max(0, total - appliedDiscountAmount);
    const submitTotals = calculateOrderTotalWithConfig(appliedSubtotal, shippingConfig);
    const appliedCouponCode = nextCouponState.valid ? nextCouponState.code : form.couponCode.trim();

    setLoading(true);
    setError(null);

    const payload = {
      shipping: {
        fullName: form.fullName.trim(),
        email: user?.email ?? "",
        phone: normalizePhoneForPayload(form.phone),
        address: form.address.trim(),
        city: form.city.trim(),
        postalCode: form.postalCode.trim(),
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
      customerNote: form.isGift ? form.giftNote.trim() : "",
      couponCode: appliedCouponCode,
      total: submitTotals.grandTotal,
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

      trackPurchase({
        orderId: data.orderId,
        items: detailedItems.map((item) => ({
          productId: item.product.id,
          price: item.unitPrice,
          quantity: item.quantity,
        })),
        totalValue: submitTotals.grandTotal,
      });
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
                  value={form[field.name]}
                  onChange={(event) => handleFieldChange(field.name, event.target.value)}
                  onBlur={() => handleFieldBlur(field.name)}
                  className={`w-full rounded-lg border bg-black/40 px-3 py-2 outline-none focus:border-[#D4AF37] ${
                    (touched[field.name] || submitAttempted) && fieldErrors[field.name]
                      ? "border-red-400/45 text-red-100"
                      : "border-[#D4AF37]/25"
                  }`}
                />
                {(touched[field.name] || submitAttempted) && fieldErrors[field.name] && (
                  <span className="mt-1 block text-xs text-red-300">{fieldErrors[field.name]}</span>
                )}
              </label>
            ))}
          </div>

          <div className="rounded-2xl border border-[#D4AF37]/18 bg-black/20 p-4">
            <label className="flex items-center gap-3 text-sm text-zinc-200">
              <input
                type="checkbox"
                checked={form.isGift}
                onChange={(event) => setForm((prev) => ({ ...prev, isGift: event.target.checked }))}
                className="h-4 w-4 accent-[#D4AF37]"
              />
              <span>Bu bir hediye mi?</span>
            </label>

            {form.isGift && (
              <label className="mt-3 block text-sm">
                <span className="mb-1 block text-zinc-300">Hediye Notu</span>
                <textarea
                  name="giftNote"
                  placeholder="Örn: İyi ki doğdun, keyifle kullan."
                  maxLength={400}
                  rows={4}
                  value={form.giftNote}
                  onChange={(event) => setForm((prev) => ({ ...prev, giftNote: event.target.value }))}
                  className="w-full rounded-lg border border-[#D4AF37]/25 bg-black/40 px-3 py-2 outline-none focus:border-[#D4AF37]"
                />
              </label>
            )}
          </div>

          <div className="rounded-2xl border border-[#D4AF37]/18 bg-black/20 p-4">
            <label className="block text-sm">
              <span className="mb-1 block text-zinc-300">Kupon Kodunuz Var mı?</span>
              <div className="flex gap-2">
                <input
                  value={form.couponCode}
                  onChange={(event) => {
                    const next = event.target.value.toUpperCase();
                    setForm((prev) => ({ ...prev, couponCode: next }));
                    setCouponState((prev) => ({
                      ...prev,
                      message: null,
                      valid: prev.code === next ? prev.valid : false,
                    }));
                  }}
                  onBlur={() => void applyCouponCode()}
                  placeholder="WELCOME10"
                  className="h-11 min-w-0 flex-1 rounded-lg border border-[#D4AF37]/25 bg-black/40 px-3 outline-none focus:border-[#D4AF37]"
                />
                <button
                  type="button"
                  onClick={() => void applyCouponCode()}
                  disabled={couponState.loading}
                  className="rounded-lg border border-[#D4AF37]/35 px-4 py-2 text-sm text-[#D4AF37] transition hover:bg-[#D4AF37]/10 disabled:opacity-45"
                >
                  {couponState.loading ? "Kontrol..." : "Uygula"}
                </button>
              </div>
            </label>
            {couponState.valid && couponState.coupon && (
              <div className="rounded-xl border border-[#D4AF37]/18 bg-black/30 p-3 text-sm">
                <p className="text-[#F3D47B]">Uygulanan Kupon: {couponState.coupon.code}</p>
                <p className="mt-1 text-red-200">
                  İndirim: -{couponDiscountAmount.toLocaleString("tr-TR")} TL
                </p>
                {couponState.coupon.collectionRestriction && (
                  <p className="mt-1 text-xs text-zinc-500">
                    Koleksiyon: {couponState.coupon.collectionRestriction}
                  </p>
                )}
              </div>
            )}
            {couponState.message && (
              <p
                className={`mt-2 text-xs ${
                  couponState.valid ? "text-[#F3D47B]" : "text-red-200"
                }`}
              >
                {couponState.message}
              </p>
            )}
          </div>

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
                    className="object-cover"
                    loading="lazy"
                    fetchPriority="low"
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
            {couponState.valid && couponDiscountAmount > 0 && (
              <div className="mt-2 flex items-center justify-between text-red-200">
                <span>Kupon İndirimi</span>
                <span>-{couponDiscountAmount.toLocaleString("tr-TR")} TL</span>
              </div>
            )}
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
