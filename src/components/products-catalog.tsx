"use client";

import { useMemo, useState } from "react";
import { Product, ProductCategory } from "@/lib/types";
import { ProductCard } from "@/components/product-card";

type SortMode = "Önerilen" | "Fiyat Artan" | "Fiyat Azalan" | "Yeni Önce";

type ProductsCatalogProps = {
  products: Product[];
};

export function ProductsCatalog({ products }: ProductsCatalogProps) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<ProductCategory | "Tümü">("Tümü");
  const [sortMode, setSortMode] = useState<SortMode>("Önerilen");

  const categories = useMemo<Array<ProductCategory | "Tümü">>(
    () => ["Tümü", ...new Set(products.map((product) => product.category))],
    [products],
  );

  const filteredProducts = useMemo(() => {
    const q = query.trim().toLowerCase();
    const draft = products.filter((product) => {
      const categoryOk = category === "Tümü" || product.category === category;
      const queryOk =
        q.length === 0 ||
        product.name.toLowerCase().includes(q) ||
        product.description.toLowerCase().includes(q) ||
        product.tags.some((tag) => tag.toLowerCase().includes(q));
      return categoryOk && queryOk;
    });

    switch (sortMode) {
      case "Fiyat Artan":
        return [...draft].sort((a, b) => a.price - b.price);
      case "Fiyat Azalan":
        return [...draft].sort((a, b) => b.price - a.price);
      case "Yeni Önce":
        return [...draft].sort((a, b) => Number(Boolean(b.isNew)) - Number(Boolean(a.isNew)));
      default:
        return draft;
    }
  }, [category, products, query, sortMode]);

  const highlightStats = useMemo(() => {
    const inStock = filteredProducts.filter((product) => product.stock > 0).length;
    const withCoating = filteredProducts.filter((product) => (product.coatingOptions?.length ?? 0) > 0).length;
    return { inStock, withCoating };
  }, [filteredProducts]);

  return (
    <div>
      <div className="mb-6 rounded-3xl border border-[#D4AF37]/25 bg-[linear-gradient(150deg,rgba(28,28,28,0.86),rgba(10,10,10,0.94))] p-4 shadow-[0_15px_40px_rgba(0,0,0,0.32)]">
        <div className="grid gap-3 md:grid-cols-[1fr_auto_auto_auto]">
          <label className="block text-sm">
            <span className="text-xs tracking-[0.18em] text-zinc-400">Arama</span>
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Ürün adı, etiket veya açıklama"
              className="mt-2 w-full rounded-xl border border-[#D4AF37]/25 bg-black/30 px-3 py-2.5 text-sm outline-none transition focus:border-[#D4AF37]"
            />
          </label>

          <label className="block text-sm">
            <span className="text-xs tracking-[0.18em] text-zinc-400">Kategori</span>
            <select
              value={category}
              onChange={(event) => setCategory(event.target.value as ProductCategory | "Tümü")}
              className="mt-2 h-[44px] w-full rounded-xl border border-[#D4AF37]/25 bg-black/30 px-3 text-sm outline-none transition focus:border-[#D4AF37]"
            >
              {categories.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </label>

          <label className="block text-sm">
            <span className="text-xs tracking-[0.18em] text-zinc-400">Sıralama</span>
            <select
              value={sortMode}
              onChange={(event) => setSortMode(event.target.value as SortMode)}
              className="mt-2 h-[44px] w-full rounded-xl border border-[#D4AF37]/25 bg-black/30 px-3 text-sm outline-none transition focus:border-[#D4AF37]"
            >
              <option value="Önerilen">Önerilen</option>
              <option value="Fiyat Artan">Fiyat Artan</option>
              <option value="Fiyat Azalan">Fiyat Azalan</option>
              <option value="Yeni Önce">Yeni Önce</option>
            </select>
          </label>

          <button
            type="button"
            onClick={() => {
              setQuery("");
              setCategory("Tümü");
              setSortMode("Önerilen");
            }}
            className="mt-auto h-[44px] rounded-xl border border-[#D4AF37]/35 px-4 text-sm font-medium text-[#D4AF37] transition hover:bg-[#D4AF37]/10"
          >
            Temizle
          </button>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          <span className="rounded-full border border-[#D4AF37]/25 bg-black/35 px-3 py-1 text-xs text-zinc-200">
            {filteredProducts.length} ürün
          </span>
          <span className="rounded-full border border-emerald-400/25 bg-emerald-500/10 px-3 py-1 text-xs text-emerald-200">
            {highlightStats.inStock} stokta
          </span>
          <span className="rounded-full border border-[#D4AF37]/30 bg-[#D4AF37]/10 px-3 py-1 text-xs text-[#D4AF37]">
            {highlightStats.withCoating} kaplama opsiyonlu
          </span>
        </div>
      </div>

      {filteredProducts.length === 0 ? (
        <div className="lux-card p-8 text-center text-zinc-300">
          Aramana uygun ürün bulunamadı. Filtreleri temizleyip tekrar deneyebilirsin.
        </div>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {filteredProducts.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      )}
    </div>
  );
}
