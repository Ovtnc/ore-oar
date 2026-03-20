"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Product } from "@/lib/types";

const LOOKBOOK_LIMIT = 8;

export default function AdminLookbookPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedSlugs, setSelectedSlugs] = useState<string[]>([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    async function load() {
      setLoading(true);
      setError(null);
      try {
        const [productsRes, lookbookRes] = await Promise.all([
          fetch("/api/admin/products", { cache: "no-store" }),
          fetch("/api/admin/lookbook", { cache: "no-store" }),
        ]);

        if (!productsRes.ok || !lookbookRes.ok) {
          throw new Error("Lookbook verileri alınamadı.");
        }

        const productsData = (await productsRes.json()) as Product[];
        const lookbookData = (await lookbookRes.json()) as { slugs?: string[] };
        if (!mounted) return;

        setProducts(productsData);
        setSelectedSlugs(Array.isArray(lookbookData.slugs) ? lookbookData.slugs : []);
      } catch (err) {
        if (!mounted) return;
        setError(err instanceof Error ? err.message : "Lookbook verileri yüklenemedi.");
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

  const selectedProducts = useMemo(() => {
    const map = new Map(products.map((product) => [product.slug, product]));
    return selectedSlugs
      .map((slug) => map.get(slug))
      .filter((product): product is Product => Boolean(product));
  }, [products, selectedSlugs]);

  const filteredProducts = useMemo(() => {
    const q = query.trim().toLowerCase();
    return products.filter((product) => {
      if (!q) return true;
      return (
        product.name.toLowerCase().includes(q) ||
        product.slug.toLowerCase().includes(q) ||
        product.category.toLowerCase().includes(q)
      );
    });
  }, [products, query]);

  function toggleProduct(slug: string) {
    setSuccess(null);
    setError(null);
    setSelectedSlugs((prev) => {
      if (prev.includes(slug)) {
        return prev.filter((item) => item !== slug);
      }
      if (prev.length >= LOOKBOOK_LIMIT) {
        setError(`En fazla ${LOOKBOOK_LIMIT} ürün seçebilirsin.`);
        return prev;
      }
      return [...prev, slug];
    });
  }

  function moveItem(slug: string, direction: "up" | "down") {
    setSelectedSlugs((prev) => {
      const index = prev.indexOf(slug);
      if (index < 0) return prev;
      const nextIndex = direction === "up" ? index - 1 : index + 1;
      if (nextIndex < 0 || nextIndex >= prev.length) return prev;
      const next = [...prev];
      [next[index], next[nextIndex]] = [next[nextIndex], next[index]];
      return next;
    });
  }

  async function save() {
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      const response = await fetch("/api/admin/lookbook", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slugs: selectedSlugs }),
      });
      const data = (await response.json()) as { slugs?: string[]; error?: string };
      if (!response.ok) {
        throw new Error(data.error ?? "Lookbook kaydedilemedi.");
      }

      setSelectedSlugs(Array.isArray(data.slugs) ? data.slugs : selectedSlugs);
      setSuccess("Lookbook başarıyla güncellendi.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Lookbook kaydedilemedi.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="mx-auto w-full max-w-7xl px-4 py-10 md:px-8">
      <div className="mb-6 rounded-3xl border border-[#D4AF37]/30 bg-[linear-gradient(135deg,rgba(212,175,55,0.16),rgba(20,20,20,0.9)_34%,rgba(8,8,8,0.95))] p-6">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-xs tracking-[0.24em] text-[#D4AF37]">HOMEPAGE CURATION</p>
            <h1 className="mt-2 text-3xl font-semibold text-zinc-100">Lookbook Yönetimi</h1>
            <p className="mt-2 text-sm text-zinc-300">
              Ana sayfada öne çıkacak ürünleri sırala. İlk ürün en önde gösterilir.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href="/admin/panel"
              className="rounded-xl border border-[#D4AF37]/40 bg-black/30 px-4 py-2 text-sm font-semibold text-[#D4AF37] transition hover:bg-[#D4AF37] hover:text-black"
            >
              Dashboard&apos;a Dön
            </Link>
            <button
              type="button"
              onClick={save}
              disabled={saving || loading}
              className="rounded-xl border border-[#D4AF37] bg-[#D4AF37] px-4 py-2 text-sm font-semibold text-black transition hover:bg-transparent hover:text-[#D4AF37] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {saving ? "Kaydediliyor..." : "Kaydet"}
            </button>
          </div>
        </div>
      </div>

      {error && <div className="mb-4 rounded-xl border border-red-400/30 bg-red-950/20 p-3 text-red-200">{error}</div>}
      {success && <div className="mb-4 rounded-xl border border-emerald-400/30 bg-emerald-900/20 p-3 text-emerald-200">{success}</div>}

      <div className="grid gap-6 lg:grid-cols-[1fr_1fr]">
        <div className="rounded-2xl border border-[#D4AF37]/20 bg-zinc-900/55 p-5">
          <div className="mb-4 flex items-center justify-between gap-3">
            <p className="text-sm font-semibold text-zinc-100">Seçili Lookbook ({selectedProducts.length}/{LOOKBOOK_LIMIT})</p>
          </div>

          {loading ? (
            <div className="py-12 text-center text-zinc-400">Yükleniyor...</div>
          ) : selectedProducts.length === 0 ? (
            <div className="rounded-xl border border-[#D4AF37]/20 bg-black/25 p-4 text-sm text-zinc-400">
              Henüz lookbook için ürün seçmedin.
            </div>
          ) : (
            <div className="space-y-3">
              {selectedProducts.map((product, index) => (
                <div key={product.slug} className="rounded-xl border border-[#D4AF37]/20 bg-black/25 p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-xs tracking-[0.2em] text-[#D4AF37]">#{index + 1}</p>
                      <p className="mt-1 truncate text-sm font-semibold text-zinc-100">{product.name}</p>
                      <p className="mt-1 text-xs text-zinc-400">{product.category} • /products/{product.slug}</p>
                    </div>
                    <div className="flex gap-1">
                      <button
                        type="button"
                        onClick={() => moveItem(product.slug, "up")}
                        className="rounded-lg border border-[#D4AF37]/30 px-2 py-1 text-xs text-zinc-200"
                        aria-label="Yukarı taşı"
                      >
                        ↑
                      </button>
                      <button
                        type="button"
                        onClick={() => moveItem(product.slug, "down")}
                        className="rounded-lg border border-[#D4AF37]/30 px-2 py-1 text-xs text-zinc-200"
                        aria-label="Aşağı taşı"
                      >
                        ↓
                      </button>
                      <button
                        type="button"
                        onClick={() => toggleProduct(product.slug)}
                        className="rounded-lg border border-red-400/35 px-2 py-1 text-xs text-red-200"
                      >
                        Kaldır
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="rounded-2xl border border-[#D4AF37]/20 bg-zinc-900/55 p-5">
          <div className="mb-4 flex items-center justify-between gap-3">
            <p className="text-sm font-semibold text-zinc-100">Ürün Havuzu</p>
            <span className="text-xs text-zinc-500">{products.length} ürün</span>
          </div>

          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Ürün ara: ad, slug, kategori"
            className="mb-4 w-full rounded-xl border border-[#D4AF37]/25 bg-black/30 px-3 py-2.5 text-sm outline-none transition focus:border-[#D4AF37]"
          />

          {loading ? (
            <div className="py-12 text-center text-zinc-400">Yükleniyor...</div>
          ) : filteredProducts.length === 0 ? (
            <div className="rounded-xl border border-[#D4AF37]/20 bg-black/25 p-4 text-sm text-zinc-400">
              Sonuç bulunamadı.
            </div>
          ) : (
            <div className="space-y-2">
              {filteredProducts.slice(0, 80).map((product) => {
                const selected = selectedSlugs.includes(product.slug);
                return (
                  <button
                    key={product.slug}
                    type="button"
                    onClick={() => toggleProduct(product.slug)}
                    className={`flex w-full items-center justify-between rounded-xl border p-3 text-left transition ${
                      selected
                        ? "border-[#D4AF37]/55 bg-[#D4AF37]/10"
                        : "border-[#D4AF37]/20 bg-black/20 hover:border-[#D4AF37]/40"
                    }`}
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-zinc-100">{product.name}</p>
                      <p className="mt-1 text-xs text-zinc-400">{product.category} • /products/{product.slug}</p>
                    </div>
                    <span className={`rounded-full border px-2 py-1 text-[10px] ${selected ? "border-[#D4AF37]/60 text-[#F3D47B]" : "border-zinc-600 text-zinc-400"}`}>
                      {selected ? "Seçili" : "Ekle"}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

