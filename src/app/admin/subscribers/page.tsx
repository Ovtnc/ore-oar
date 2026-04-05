"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { NewsletterSubscriber } from "@/lib/types";

export default function AdminSubscribersPage() {
  const [subscribers, setSubscribers] = useState<NewsletterSubscriber[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    async function load() {
      try {
        const response = await fetch("/api/admin/settings/newsletter", { cache: "no-store" });
        const data = (await response.json().catch(() => null)) as { subscribers?: NewsletterSubscriber[]; error?: string } | null;
        if (!response.ok) throw new Error(data?.error ?? "Aboneler yüklenemedi.");
        if (!mounted) return;
        setSubscribers(Array.isArray(data?.subscribers) ? data!.subscribers : []);
      } catch (err) {
        if (!mounted) return;
        setError(err instanceof Error ? err.message : "Aboneler yüklenemedi.");
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

  return (
    <section className="mx-auto w-full max-w-6xl px-4 py-10 md:px-8">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs tracking-[0.24em] text-[#D4AF37]">MARKETING OPS</p>
          <h1 className="mt-2 text-3xl font-semibold text-zinc-100">Aboneler</h1>
          <p className="mt-2 text-sm text-zinc-400">Footer e-bülten formundan kayıt olan adresler.</p>
        </div>
        <Link href="/admin/panel" className="rounded-xl border border-[#D4AF37]/35 px-4 py-2 text-sm text-[#D4AF37] transition hover:bg-[#D4AF37]/10">
          Panoya Dön
        </Link>
      </div>

      {error && <div className="mb-4 rounded-2xl border border-red-400/30 bg-red-950/20 p-4 text-red-200">{error}</div>}

      {loading ? (
        <div className="rounded-2xl border border-[#D4AF37]/20 bg-zinc-900/60 p-6 text-zinc-300">Yükleniyor...</div>
      ) : subscribers.length === 0 ? (
        <div className="rounded-2xl border border-[#D4AF37]/20 bg-zinc-900/60 p-6 text-zinc-300">Henüz abonelik yok.</div>
      ) : (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {subscribers.map((subscriber) => (
            <article key={subscriber.email} className="rounded-2xl border border-[#D4AF37]/20 bg-zinc-900/60 p-4">
              <p className="text-sm font-medium text-zinc-100">{subscriber.email}</p>
              <p className="mt-2 text-xs text-zinc-500">
                Kayıt: {new Date(subscriber.createdAt).toLocaleString("tr-TR")}
              </p>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}

