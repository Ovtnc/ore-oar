"use client";

import Link from "next/link";
import { FormEvent, Suspense, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/components/auth-provider";

function normalizeNextPath(raw: string | null) {
  if (!raw) return "/checkout";
  if (!raw.startsWith("/")) return "/checkout";
  if (raw.startsWith("//")) return "/checkout";
  return raw;
}

function SignupContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { refreshSession } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const nextPath = useMemo(
    () => normalizeNextPath(searchParams.get("next")),
    [searchParams],
  );

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setLoading(true);

    const formData = new FormData(event.currentTarget);
    const payload = {
      name: String(formData.get("name") ?? ""),
      email: String(formData.get("email") ?? ""),
      password: String(formData.get("password") ?? ""),
    };

    try {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = (await response.json().catch(() => null)) as { error?: string } | null;
      if (!response.ok) {
        setError(data?.error ?? "Kayıt başarısız.");
        return;
      }

      await refreshSession();
      router.push(nextPath);
      router.refresh();
    } catch {
      setError("Kayıt sırasında bir hata oluştu.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="mx-auto w-full max-w-md px-4 py-14 md:px-8">
      <div className="rounded-2xl border border-[#D4AF37]/25 bg-zinc-900/60 p-6">
        <p className="text-xs tracking-[0.2em] text-[#D4AF37]">ÜYELİK</p>
        <h1 className="mt-2 text-3xl font-semibold text-zinc-100">Kayıt Ol</h1>
        <p className="mt-2 text-sm text-zinc-400">
          Hesap oluşturarak siparişini hızlıca tamamlayabilirsin.
        </p>

        <form onSubmit={onSubmit} className="mt-6 space-y-4">
          <label className="block text-sm">
            <span className="mb-1 block text-zinc-300">Ad Soyad</span>
            <input
              name="name"
              type="text"
              required
              className="w-full rounded-lg border border-[#D4AF37]/25 bg-black/35 px-3 py-2 outline-none focus:border-[#D4AF37]"
            />
          </label>

          <label className="block text-sm">
            <span className="mb-1 block text-zinc-300">E-posta</span>
            <input
              name="email"
              type="email"
              required
              className="w-full rounded-lg border border-[#D4AF37]/25 bg-black/35 px-3 py-2 outline-none focus:border-[#D4AF37]"
            />
          </label>

          <label className="block text-sm">
            <span className="mb-1 block text-zinc-300">Şifre</span>
            <input
              name="password"
              type="password"
              minLength={6}
              required
              className="w-full rounded-lg border border-[#D4AF37]/25 bg-black/35 px-3 py-2 outline-none focus:border-[#D4AF37]"
            />
          </label>

          {error && (
            <div className="rounded-lg border border-red-400/30 bg-red-950/20 p-3 text-sm text-red-200">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg border border-[#D4AF37] bg-[#D4AF37] px-5 py-3 text-sm font-semibold text-black transition disabled:opacity-50"
          >
            {loading ? "Kayıt oluşturuluyor..." : "Kayıt Ol"}
          </button>
        </form>

        <p className="mt-4 text-sm text-zinc-400">
          Zaten hesabın var mı?{" "}
          <Link href={`/login?next=${encodeURIComponent(nextPath)}`} className="text-[#D4AF37] hover:underline">
            Giriş Yap
          </Link>
        </p>
      </div>
    </section>
  );
}

export default function SignupPage() {
  return (
    <Suspense
      fallback={
        <section className="mx-auto w-full max-w-md px-4 py-14 md:px-8">
          <div className="rounded-2xl border border-[#D4AF37]/25 bg-zinc-900/60 p-6 text-zinc-300">
            Sayfa hazırlanıyor...
          </div>
        </section>
      }
    >
      <SignupContent />
    </Suspense>
  );
}
