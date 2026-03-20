"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSearchParams } from "next/navigation";

const DEFAULT_IBAN = "TR00 0000 0000 0000 0000 0000 00";

function PaymentContent() {
  const params = useSearchParams();
  const router = useRouter();
  const orderId = params.get("orderId");

  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [iban, setIban] = useState(DEFAULT_IBAN);
  const [ibanLabel, setIbanLabel] = useState<string | null>(null);
  const [accountHolderName, setAccountHolderName] = useState<string | null>(null);
  const [ibanLoading, setIbanLoading] = useState(true);
  const [redirectCountdown, setRedirectCountdown] = useState(5);

  useEffect(() => {
    let mounted = true;

    async function loadIban() {
      if (!orderId) {
        setIbanLoading(false);
        return;
      }
      setIbanLoading(true);
      try {
        const response = await fetch(`/api/orders/${orderId}/payment-info`, { cache: "no-store" });
        const data = (await response.json().catch(() => null)) as
          | { iban?: string; ibanLabel?: string; accountHolderName?: string; error?: string }
          | null;
        if (!response.ok) {
          setError(data?.error ?? "Sipariş için ödeme bilgisi alınamadı.");
          return;
        }
        if (!mounted) return;
        setIban(data?.iban?.trim() || DEFAULT_IBAN);
        setIbanLabel(data?.ibanLabel?.trim() || null);
        setAccountHolderName(data?.accountHolderName?.trim() || null);
      } finally {
        if (!mounted) return;
        setIbanLoading(false);
      }
    }

    void loadIban();
    return () => {
      mounted = false;
    };
  }, [orderId]);

  useEffect(() => {
    if (!done) return;

    setRedirectCountdown(5);
    const countdownInterval = setInterval(() => {
      setRedirectCountdown((prev) => {
        if (prev <= 1) return 0;
        return prev - 1;
      });
    }, 1000);

    const timeout = setTimeout(() => {
      router.push("/orders");
    }, 5000);

    return () => {
      clearInterval(countdownInterval);
      clearTimeout(timeout);
    };
  }, [done, router]);

  async function notifyPayment() {
    if (!orderId) return;
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/orders/${orderId}/payment-sent`, { method: "POST" });
      const data = (await response.json().catch(() => null)) as { error?: string } | null;
      if (!response.ok) {
        setError(data?.error ?? "Ödeme bildirimi gönderilemedi.");
        return;
      }
      setDone(true);
    } finally {
      setLoading(false);
    }
  }

  async function copyIban() {
    try {
      await navigator.clipboard.writeText(iban);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      setCopied(false);
    }
  }

  return (
    <section className="mx-auto w-full max-w-3xl px-4 py-10 md:px-8">
      <h1 className="text-4xl font-semibold text-zinc-100">Ödeme</h1>
      <p className="mt-2 text-zinc-400">Sipariş tutarını aşağıdaki IBAN&apos;a gönderin, ardından bildirimi tamamlayın.</p>

      {!orderId ? (
        <div className="mt-8 rounded-2xl border border-[#D4AF37]/25 bg-zinc-900/60 p-6">
          <p className="text-zinc-300">Sipariş numarası bulunamadı.</p>
          <Link href="/products" className="mt-3 inline-block text-sm text-[#D4AF37] hover:underline">
            Koleksiyona dön
          </Link>
        </div>
      ) : (
        <div className="mt-8 rounded-2xl border border-[#D4AF37]/35 bg-zinc-900/60 p-6">
          {ibanLabel && (
            <p className="text-xs tracking-[0.2em] text-zinc-400">{ibanLabel}</p>
          )}
          {accountHolderName && (
            <p className="mt-1 text-sm text-zinc-300">
              Hesap Sahibi: <span className="font-semibold text-zinc-100">{accountHolderName}</span>
            </p>
          )}
          <p className="text-xs tracking-[0.2em] text-[#D4AF37]">IBAN</p>
          <p className="mt-2 break-all text-2xl font-semibold text-zinc-100">{ibanLoading ? "Yükleniyor..." : iban}</p>

          <div className="mt-4 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={copyIban}
              disabled={ibanLoading}
              className="rounded-lg border border-[#D4AF37]/45 px-4 py-2 text-sm text-[#D4AF37] transition hover:bg-[#D4AF37] hover:text-black"
            >
              {copied ? "IBAN Kopyalandı" : "IBAN Kopyala"}
            </button>
            <p className="self-center text-sm text-zinc-400">Sipariş No: {orderId}</p>
          </div>

          <button
            type="button"
            onClick={notifyPayment}
            disabled={loading || done}
            className="mt-6 rounded-lg border border-[#D4AF37] bg-[#D4AF37] px-5 py-3 text-sm font-semibold text-black transition disabled:opacity-50"
          >
            {done ? "Ödeme Bildirimi Gönderildi" : loading ? "Gönderiliyor..." : "Ödemeyi Yaptım"}
          </button>
          {error && (
            <div className="mt-4 rounded-lg border border-red-400/30 bg-red-950/20 p-3 text-sm text-red-200">
              {error}
            </div>
          )}
          {done && (
            <div className="mt-4 rounded-lg border border-emerald-400/35 bg-emerald-900/20 p-4 text-sm text-emerald-200">
              <p className="font-semibold">Teşekkürler, ödemeniz için bildiriminizi aldık.</p>
              <p className="mt-1">Siparişlerim sayfasına {redirectCountdown} saniye içinde yönlendiriliyorsunuz.</p>
            </div>
          )}
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
