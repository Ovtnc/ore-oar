"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

function PaymentContent() {
  const params = useSearchParams();
  const orderId = params.get("orderId");

  const [error, setError] = useState<string | null>(null);
  const [whatsappUrl, setWhatsappUrl] = useState<string | null>(null);
  const [infoLoading, setInfoLoading] = useState(true);
  const [startingFlow, setStartingFlow] = useState(false);
  const [paymentChatStartedAt, setPaymentChatStartedAt] = useState<string | null>(null);
  const [paymentVerifiedAt, setPaymentVerifiedAt] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    async function loadInfo() {
      if (!orderId) {
        setInfoLoading(false);
        return;
      }
      setInfoLoading(true);
      try {
        const response = await fetch(`/api/orders/${orderId}/payment-info`, { cache: "no-store" });
        const data = (await response.json().catch(() => null)) as
          | {
              whatsappUrl?: string;
              paymentChatStartedAt?: string | null;
              paymentVerifiedAt?: string | null;
              error?: string;
            }
          | null;
        if (!response.ok) {
          setError(data?.error ?? "Sipariş için ödeme bilgisi alınamadı.");
          return;
        }
        if (!mounted) return;
        setWhatsappUrl(data?.whatsappUrl?.trim() || null);
        setPaymentChatStartedAt(data?.paymentChatStartedAt ?? null);
        setPaymentVerifiedAt(data?.paymentVerifiedAt ?? null);
      } finally {
        if (!mounted) return;
        setInfoLoading(false);
      }
    }

    void loadInfo();
    return () => {
      mounted = false;
    };
  }, [orderId]);

  function formatDate(value: string | null) {
    if (!value) return "";
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return "";
    return parsed.toLocaleString("tr-TR");
  }

  async function startWhatsappFlow() {
    if (!orderId || !whatsappUrl) return;
    setStartingFlow(true);
    setError(null);
    try {
      const popup = window.open(whatsappUrl, "_blank", "noopener,noreferrer");
      if (!popup) {
        window.location.href = whatsappUrl;
      }

      const response = await fetch(`/api/orders/${orderId}/whatsapp-start`, { method: "POST" });
      const data = (await response.json().catch(() => null)) as
        | { error?: string; paymentChatStartedAt?: string | null }
        | null;
      if (!response.ok) {
        setError(data?.error ?? "WhatsApp ödeme süreci başlatılamadı.");
        return;
      }
      setPaymentChatStartedAt(data?.paymentChatStartedAt ?? new Date().toISOString());
    } finally {
      setStartingFlow(false);
    }
  }

  return (
    <section className="mx-auto w-full max-w-3xl px-4 py-10 md:px-8">
      <h1 className="text-4xl font-semibold text-zinc-100">Ödeme</h1>
      <p className="mt-2 text-zinc-400">
        WhatsApp butonuna basın, sipariş mesajı bize iletilsin. IBAN bilgisini sohbetten paylaşacağız; ödeme sonrası dekontu yine oradan gönderin.
      </p>

      {!orderId ? (
        <div className="mt-8 rounded-2xl border border-[#D4AF37]/25 bg-zinc-900/60 p-6">
          <p className="text-zinc-300">Sipariş numarası bulunamadı.</p>
          <Link href="/products" className="mt-3 inline-block text-sm text-[#D4AF37] hover:underline">
            Koleksiyona dön
          </Link>
        </div>
      ) : (
        <div className="mt-8 rounded-2xl border border-[#D4AF37]/35 bg-zinc-900/60 p-6">
          <div className="rounded-xl border border-[#D4AF37]/20 bg-black/25 p-4">
            <p className="text-sm text-zinc-300">
              1. WhatsApp görüşmesini başlatın.
              <br />
              2. Sipariş mesajınız bize ulaşsın.
              <br />
              3. IBAN bilgisi sohbetten size iletilsin ve ödemeyi yapın.
              <br />
              4. Dekontu gönderin, biz kontrol edip sipariş durumunu güncelleyelim.
            </p>
          </div>

          <div className="mt-4 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={startWhatsappFlow}
              disabled={infoLoading || !whatsappUrl || startingFlow}
              className="rounded-lg border border-emerald-400/45 bg-emerald-400/10 px-4 py-2 text-sm text-emerald-200 transition hover:bg-emerald-400/20 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {startingFlow ? "Yönlendiriliyor..." : "WhatsApp ile Ödeme Sürecini Başlat"}
            </button>
            <p className="self-center text-sm text-zinc-400">Sipariş No: {orderId}</p>
          </div>

          {!whatsappUrl && !infoLoading && (
            <p className="mt-3 text-sm text-amber-200">
              WhatsApp ödeme hattı henüz tanımlı değil. Lütfen yöneticiyle iletişime geçin.
            </p>
          )}
          {paymentChatStartedAt && (
            <p className="mt-3 text-sm text-zinc-400">
              WhatsApp süreci başlatıldı:{" "}
              <span className="text-zinc-200">{formatDate(paymentChatStartedAt)}</span>
            </p>
          )}
          {paymentVerifiedAt && (
            <div className="mt-4 rounded-lg border border-emerald-400/35 bg-emerald-900/20 p-4 text-sm text-emerald-200">
              <p className="font-semibold">Dekont doğrulandı, siparişiniz ödeme onayı aldı.</p>
              <p className="mt-1">Doğrulama zamanı: {formatDate(paymentVerifiedAt)}</p>
            </div>
          )}
          {error && (
            <div className="mt-4 rounded-lg border border-red-400/30 bg-red-950/20 p-3 text-sm text-red-200">
              {error}
            </div>
          )}
          <Link href="/orders" className="mt-4 inline-block text-sm text-[#D4AF37] hover:underline">
            Siparişlerime dön
          </Link>
        </div>
      )}
    </section>
  );
}

export default function PaymentPage() {
  return (
    <Suspense
      fallback={
        <section className="mx-auto w-full max-w-3xl px-4 py-10 md:px-8">
          Ödeme sayfası yükleniyor...
        </section>
      }
    >
      <PaymentContent />
    </Suspense>
  );
}
