"use client";

import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Product, ProductCategory } from "@/lib/types";
import { ProductCard } from "@/components/product-card";

type SortMode = "Fiyat Artan" | "Fiyat Azalan" | "Yeni Eklenenler";

type ProductsCatalogProps = {
  products: Product[];
};

function Toggle({
  checked,
  onChange,
}: {
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-7 w-12 items-center rounded-full border transition ${
        checked
          ? "border-[#D4AF37] bg-[#D4AF37]/25"
          : "border-[#D4AF37]/25 bg-black/40"
      }`}
      aria-label="Stok filtresi"
      aria-pressed={checked}
    >
      <span
        className={`inline-block h-5 w-5 transform rounded-full bg-[#F3D47B] transition ${
          checked ? "translate-x-6" : "translate-x-1"
        }`}
      />
    </button>
  );
}

export function ProductsCatalog({ products }: ProductsCatalogProps) {
  const [query, setQuery] = useState("");
  const [selectedCategories, setSelectedCategories] = useState<ProductCategory[]>([]);
  const [inStockOnly, setInStockOnly] = useState(false);
  const [sortMode, setSortMode] = useState<SortMode>("Yeni Eklenenler");

  const priceBounds = useMemo(() => {
    if (products.length === 0) return { min: 0, max: 0 };
    const values = products.map((product) => product.price);
    return { min: Math.min(...values), max: Math.max(...values) };
  }, [products]);

  const [priceMin, setPriceMin] = useState(priceBounds.min);
  const [priceMax, setPriceMax] = useState(priceBounds.max);

  const categories = useMemo<Array<ProductCategory>>(
    () => Array.from(new Set(products.map((product) => product.category))),
    [products],
  );

  function toggleCategory(category: ProductCategory) {
    setSelectedCategories((prev) =>
      prev.includes(category)
        ? prev.filter((item) => item !== category)
        : [...prev, category],
    );
  }

  const filteredProducts = useMemo(() => {
    const q = query.trim().toLowerCase();

    const draft = products.filter((product) => {
      const queryOk =
        q.length === 0 ||
        product.name.toLowerCase().includes(q) ||
        product.description.toLowerCase().includes(q) ||
        product.tags.some((tag) => tag.toLowerCase().includes(q));

      const categoryOk =
        selectedCategories.length === 0 || selectedCategories.includes(product.category);

      const priceOk = product.price >= priceMin && product.price <= priceMax;
      const stockOk = !inStockOnly || product.stock > 0;

      return queryOk && categoryOk && priceOk && stockOk;
    });

    switch (sortMode) {
      case "Fiyat Artan":
        return [...draft].sort((a, b) => a.price - b.price);
      case "Fiyat Azalan":
        return [...draft].sort((a, b) => b.price - a.price);
      case "Yeni Eklenenler":
      default:
        return [...draft].sort((a, b) => Number(Boolean(b.isNew)) - Number(Boolean(a.isNew)));
    }
  }, [inStockOnly, priceMax, priceMin, products, query, selectedCategories, sortMode]);

  const highlightStats = useMemo(() => {
    const inStock = filteredProducts.filter((product) => product.stock > 0).length;
    const withCoating = filteredProducts.filter((product) => (product.coatingOptions?.length ?? 0) > 0).length;
    return { inStock, withCoating };
  }, [filteredProducts]);

  return (
    <div>
      <div className="mb-6 rounded-3xl border border-[#D4AF37]/25 bg-[linear-gradient(150deg,rgba(28,28,28,0.86),rgba(10,10,10,0.94))] p-4 shadow-[0_15px_40px_rgba(0,0,0,0.32)]">
        <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
          <label className="block w-full max-w-md text-sm">
            <span className="text-xs tracking-[0.18em] text-zinc-400">Arama</span>
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Ürün adı, etiket veya açıklama"
              className="mt-2 h-[44px] w-full rounded-xl border border-[#D4AF37]/25 bg-black/30 px-3 text-sm outline-none transition focus:border-[#D4AF37]"
            />
          </label>

          <label className="block text-sm">
            <span className="text-xs tracking-[0.18em] text-zinc-400">Sıralama</span>
            <select
              value={sortMode}
              onChange={(event) => setSortMode(event.target.value as SortMode)}
              className="mt-2 h-[44px] min-w-[220px] rounded-xl border border-[#D4AF37]/25 bg-black/30 px-3 text-sm outline-none transition focus:border-[#D4AF37]"
            >
              <option value="Yeni Eklenenler">Yeni Eklenenler</option>
              <option value="Fiyat Artan">Fiyat Artan</option>
              <option value="Fiyat Azalan">Fiyat Azalan</option>
            </select>
          </label>
        </div>

        <div className="grid gap-4 lg:grid-cols-[1.1fr_1fr_0.8fr]">
          <div className="rounded-2xl border border-[#D4AF37]/18 bg-black/25 p-3">
            <p className="text-xs tracking-[0.18em] text-zinc-400">KATEGORİ</p>
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              {categories.map((category) => {
                const checked = selectedCategories.includes(category);
                return (
                  <label
                    key={category}
                    className={`flex cursor-pointer items-center gap-2 rounded-lg border px-2.5 py-2 text-xs transition ${
                      checked
                        ? "border-[#D4AF37]/55 bg-[#D4AF37]/10 text-[#F3D47B]"
                        : "border-[#D4AF37]/20 text-zinc-300 hover:border-[#D4AF37]/35"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggleCategory(category)}
                      className="accent-[#D4AF37]"
                    />
                    {category}
                  </label>
                );
              })}
            </div>
          </div>

          <div className="rounded-2xl border border-[#D4AF37]/18 bg-black/25 p-3">
            <p className="text-xs tracking-[0.18em] text-zinc-400">FİYAT ARALIĞI</p>
            <div className="mt-3 flex items-center justify-between text-xs text-zinc-300">
              <span>{priceMin.toLocaleString("tr-TR")} TL</span>
              <span>{priceMax.toLocaleString("tr-TR")} TL</span>
            </div>

            <div className="mt-3 space-y-2">
              <input
                type="range"
                min={priceBounds.min}
                max={priceBounds.max}
                step={50}
                value={priceMin}
                onChange={(event) => {
                  const next = Number(event.target.value);
                  setPriceMin(Math.min(next, priceMax));
                }}
                className="w-full accent-[#D4AF37]"
              />
              <input
                type="range"
                min={priceBounds.min}
                max={priceBounds.max}
                step={50}
                value={priceMax}
                onChange={(event) => {
                  const next = Number(event.target.value);
                  setPriceMax(Math.max(next, priceMin));
                }}
                className="w-full accent-[#D4AF37]"
              />
            </div>
          </div>

          <div className="rounded-2xl border border-[#D4AF37]/18 bg-black/25 p-3">
            <p className="text-xs tracking-[0.18em] text-zinc-400">STOK DURUMU</p>
            <div className="mt-3 flex items-center justify-between gap-3">
              <span className="text-sm text-zinc-300">Sadece stoktaki ürünler</span>
              <Toggle checked={inStockOnly} onChange={setInStockOnly} />
            </div>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2">
          <span className="rounded-full border border-[#D4AF37]/25 bg-black/35 px-3 py-1 text-xs text-zinc-200">
            {filteredProducts.length} ürün
          </span>
          <span className="rounded-full border border-emerald-400/25 bg-emerald-500/10 px-3 py-1 text-xs text-emerald-200">
            {highlightStats.inStock} stokta
          </span>
          <span className="rounded-full border border-[#D4AF37]/30 bg-[#D4AF37]/10 px-3 py-1 text-xs text-[#D4AF37]">
            {highlightStats.withCoating} kaplama opsiyonlu
          </span>

          <button
            type="button"
            onClick={() => {
              setQuery("");
              setSelectedCategories([]);
              setInStockOnly(false);
              setSortMode("Yeni Eklenenler");
              setPriceMin(priceBounds.min);
              setPriceMax(priceBounds.max);
            }}
            className="ml-auto rounded-xl border border-[#D4AF37]/35 px-4 py-2 text-xs font-medium text-[#D4AF37] transition hover:bg-[#D4AF37]/10"
          >
            Filtreleri Temizle
          </button>
        </div>
      </div>

      {filteredProducts.length === 0 ? (
        <div className="lux-card p-8 text-center text-zinc-300">
          Aramana uygun ürün bulunamadı. Filtreleri temizleyip tekrar deneyebilirsin.
        </div>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {filteredProducts.map((product, index) => (
            <motion.div
              key={product.id}
              initial={{ opacity: 0, y: 28 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.25 }}
              transition={{ duration: 0.55, ease: "easeInOut", delay: Math.min(index * 0.04, 0.25) }}
            >
              <ProductCard product={product} enableQuickView />
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
