"use client";

import Image from "next/image";
import { FormEvent, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { toSafePrice } from "@/lib/price";
import { Product, ProductCategory, ProductCoatingOption } from "@/lib/types";

const categories: ProductCategory[] = ["Kolye", "Bileklik", "Pin", "Küpe", "Anahtarlık", "Aksesuar"];

type ProductFormState = {
  slug: string;
  name: string;
  category: ProductCategory;
  description: string;
  price: string;
  material: string;
  image: string;
  images: string[];
  collection: string;
  finish: string;
  stock: string;
  leadTimeDays: string;
  tags: string;
  seoKeywords: string;
  isNew: boolean;
  isLimited: boolean;
  hasCoating: boolean;
  coatingOptions: Array<{
    id: string;
    name: string;
    priceDelta: string;
  }>;
};

function emptyForm(): ProductFormState {
  return {
    slug: "",
    name: "",
    category: "Kolye",
    description: "",
    price: "",
    material: "",
    image: "",
    images: [],
    collection: "Atelier 01",
    finish: "Ayna polisaj",
    stock: "0",
    leadTimeDays: "3",
    tags: "",
    seoKeywords: "",
    isNew: false,
    isLimited: false,
    hasCoating: false,
    coatingOptions: [],
  };
}

function normalizeCoatingId(input: string) {
  return input
    .trim()
    .toLowerCase()
    .replace(/ğ/g, "g")
    .replace(/ü/g, "u")
    .replace(/ş/g, "s")
    .replace(/ı/g, "i")
    .replace(/ö/g, "o")
    .replace(/ç/g, "c")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function normalizeImageUrls(input: string[]) {
  return Array.from(new Set(input.map((item) => item.trim()).filter(Boolean)));
}

function normalizeDisplayImageUrl(input: string | null | undefined) {
  if (!input) return "";
  const value = input.trim();
  if (!value) return "";

  const uploadsIndex = value.toLowerCase().lastIndexOf("/uploads/");
  if (uploadsIndex >= 0) {
    return value.slice(uploadsIndex);
  }
  if (value.toLowerCase().startsWith("uploads/")) {
    return `/${value}`;
  }
  if (value.toLowerCase().startsWith("public/uploads/")) {
    return `/${value.slice("public/".length)}`;
  }
  return value;
}

function toCoatingRows(options?: ProductCoatingOption[]) {
  if (!options || options.length === 0) return [];
  return options.map((option) => ({
    id: option.id,
    name: option.name,
    priceDelta: String(option.priceDelta),
  }));
}

function emptyCoatingRow(index: number) {
  return { id: `kaplama-${index + 1}`, name: "", priceDelta: "0" };
}

function stockMeta(stock: number) {
  if (stock <= 0) {
    return {
      label: "Tükendi",
      className: "border-red-400/35 bg-red-500/10 text-red-200",
    };
  }
  if (stock <= 5) {
    return {
      label: "Kritik",
      className: "border-amber-400/40 bg-amber-500/10 text-amber-200",
    };
  }
  return {
    label: "Uygun",
    className: "border-emerald-400/35 bg-emerald-500/10 text-emerald-200",
  };
}

const fieldClass =
  "w-full rounded-xl border border-[#D4AF37]/25 bg-black/30 px-3 py-2.5 text-sm outline-none transition focus:border-[#D4AF37] focus:shadow-[0_0_0_3px_rgba(212,175,55,0.14)]";

export default function AdminProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState<ProductFormState>(emptyForm());
  const [editingSlug, setEditingSlug] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [query, setQuery] = useState("");
  const [collectionFilter, setCollectionFilter] = useState("Tümü");
  const [selectedProductIds, setSelectedProductIds] = useState<string[]>([]);
  const [bulkPrice, setBulkPrice] = useState("");
  const [bulkStock, setBulkStock] = useState("");

  useEffect(() => {
    fetch("/api/admin/products", { cache: "no-store" })
      .then((res) => res.json())
      .then((data) => setProducts(data as Product[]))
      .catch(() => setError("Ürünler yüklenemedi."))
      .finally(() => setLoading(false));
  }, []);

  const formPreviewUrl = useMemo(() => {
    return normalizeDisplayImageUrl(form.images[0] || form.image.trim() || "") || null;
  }, [form.image, form.images]);

  const filteredProducts = useMemo(() => {
    const q = query.trim().toLowerCase();
    return products
      .filter((product) => {
        if (collectionFilter !== "Tümü" && product.collection !== collectionFilter) return false;
        return (
          !q ||
          product.name.toLowerCase().includes(q) ||
          product.slug.toLowerCase().includes(q) ||
          product.collection.toLowerCase().includes(q)
        );
      })
      .sort((a, b) => a.stock - b.stock);
  }, [collectionFilter, products, query]);

  const inventoryStats = useMemo(() => {
    const totalStock = products.reduce((sum, product) => sum + product.stock, 0);
    const lowStock = products.filter((product) => product.stock > 0 && product.stock <= 5).length;
    const outOfStock = products.filter((product) => product.stock <= 0).length;
    return { totalStock, lowStock, outOfStock };
  }, [products]);

  const categoryStats = useMemo(() => {
    return categories.map((category) => ({
      category,
      count: products.filter((product) => product.category === category).length,
    }));
  }, [products]);

  const stockHealth = useMemo(() => {
    if (products.length === 0) return 0;
    const healthy = products.filter((product) => product.stock > 5).length;
    return Math.round((healthy / products.length) * 100);
  }, [products]);

  const collectionOptions = useMemo(
    () => ["Tümü", ...Array.from(new Set(products.map((product) => product.collection)))],
    [products],
  );

  const selectedProducts = useMemo(
    () => products.filter((product) => selectedProductIds.includes(product.id)),
    [products, selectedProductIds],
  );

  function toggleSelectedProduct(productId: string) {
    setSelectedProductIds((prev) =>
      prev.includes(productId) ? prev.filter((id) => id !== productId) : [...prev, productId],
    );
  }

  async function applyBulkUpdate(mode: "price" | "stock") {
    const targetProducts = selectedProducts;
    if (targetProducts.length === 0) {
      setError("Önce ürün seçin.");
      return;
    }

    const normalizedValue = mode === "price" ? Math.max(0, Math.trunc(Number(bulkPrice || 0))) : Math.max(0, Math.trunc(Number(bulkStock || 0)));
    if (!Number.isFinite(normalizedValue)) {
      setError("Geçerli bir değer girin.");
      return;
    }

    setError(null);
    try {
      for (const product of targetProducts) {
        const payload = {
          slug: product.slug,
          name: product.name,
          category: product.category,
          description: product.description,
          price: mode === "price" ? normalizedValue : product.price,
          material: product.material,
          image: product.image,
          images: product.images ?? [],
          collection: product.collection,
          finish: product.finish,
          stock: mode === "stock" ? normalizedValue : product.stock,
          leadTimeDays: product.leadTimeDays,
          tags: product.tags,
          seoKeywords: product.seoKeywords ?? [],
          coatingOptions: product.coatingOptions ?? [],
          isNew: product.isNew ?? false,
          isLimited: product.isLimited ?? false,
        };
        const res = await fetch(`/api/admin/products/${product.slug}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (!res.ok) {
          throw new Error("Toplu güncelleme başarısız.");
        }
      }
      await refresh();
      setSelectedProductIds([]);
      setBulkPrice("");
      setBulkStock("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Toplu güncelleme başarısız.");
    }
  }

  function setCoatingEnabled(enabled: boolean) {
    setForm((prev) => {
      if (!enabled) return { ...prev, hasCoating: false, coatingOptions: [] };
      const nextRows = prev.coatingOptions.length > 0 ? prev.coatingOptions : [emptyCoatingRow(0)];
      return { ...prev, hasCoating: true, coatingOptions: nextRows };
    });
  }

  function addCoatingRow() {
    setForm((prev) => ({
      ...prev,
      hasCoating: true,
      coatingOptions: [...prev.coatingOptions, emptyCoatingRow(prev.coatingOptions.length)],
    }));
  }

  function removeCoatingRow(index: number) {
    setForm((prev) => {
      const next = prev.coatingOptions.filter((_, i) => i !== index);
      return {
        ...prev,
        hasCoating: next.length > 0,
        coatingOptions: next,
      };
    });
  }

  function updateCoatingRow(index: number, patch: Partial<ProductFormState["coatingOptions"][number]>) {
    setForm((prev) => ({
      ...prev,
      coatingOptions: prev.coatingOptions.map((row, i) => (i === index ? { ...row, ...patch } : row)),
    }));
  }

  function setFormImages(nextImages: string[]) {
    const normalized = normalizeImageUrls(nextImages);
    setForm((prev) => ({
      ...prev,
      images: normalized,
      image: normalized[0] ?? "",
    }));
  }

  function parseImageTextarea(value: string) {
    return normalizeImageUrls(value.split(/[\n,]/).map((item) => item.trim()));
  }

  function fillForm(p: Product) {
    const images = normalizeImageUrls(p.images && p.images.length > 0 ? p.images : [p.image]);

    setEditingSlug(p.slug);
    setForm({
      slug: p.slug,
      name: p.name,
      category: p.category,
      description: p.description,
      price: String(p.price),
      material: p.material,
      image: images[0] ?? "",
      images,
      collection: p.collection,
      finish: p.finish,
      stock: String(p.stock),
      leadTimeDays: String(p.leadTimeDays),
      tags: p.tags.join(", "),
      seoKeywords: (p.seoKeywords ?? []).join(", "),
      isNew: p.isNew ?? false,
      isLimited: p.isLimited ?? false,
      hasCoating: Boolean(p.coatingOptions && p.coatingOptions.length > 0),
      coatingOptions: toCoatingRows(p.coatingOptions),
    });
  }

  async function refresh() {
    const res = await fetch("/api/admin/products", { cache: "no-store" });
    const data = (await res.json()) as Product[];
    setProducts(data);
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    const normalizedImages = normalizeImageUrls([...form.images, form.image]);
    const coatingOptions = form.hasCoating
      ? form.coatingOptions
          .map((option) => {
            const name = option.name.trim();
            if (!name) return null;
            const priceDelta = Math.round(toSafePrice(option.priceDelta));
            const normalizedId = normalizeCoatingId(option.id || option.name);
            if (!normalizedId) return null;
            return { id: normalizedId, name, priceDelta };
          })
          .filter((option): option is { id: string; name: string; priceDelta: number } => option !== null)
      : [];

    const payload = {
      slug: form.slug,
      name: form.name,
      category: form.category,
      description: form.description,
      price: toSafePrice(form.price),
      material: form.material,
      image: normalizedImages[0] || "/products/aether.jpg",
      images: normalizedImages,
      collection: form.collection,
      finish: form.finish,
      stock: Number(form.stock || "0"),
      leadTimeDays: Number(form.leadTimeDays || "0"),
      tags: form.tags,
      seoKeywords: form.seoKeywords,
      coatingOptions,
      isNew: form.isNew,
      isLimited: form.isLimited,
    };

    setError(null);
    try {
      if (editingSlug) {
        const res = await fetch(`/api/admin/products/${editingSlug}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (!res.ok) {
          const data = (await res.json().catch(() => null)) as { error?: string } | null;
          throw new Error(data?.error ?? "Güncelleme başarısız.");
        }
      } else {
        const res = await fetch("/api/admin/products", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (!res.ok) {
          const data = (await res.json().catch(() => null)) as { error?: string } | null;
          throw new Error(data?.error ?? "Kaydetme başarısız.");
        }
      }
      setForm(emptyForm());
      setEditingSlug(null);
      await refresh();
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("Ürün kaydedilemedi.");
      }
    }
  }

  async function onDelete(slug: string) {
    if (!confirm("Bu ürünü silmek istediğinize emin misiniz?")) return;
    setError(null);
    try {
      const res = await fetch(`/api/admin/products/${slug}`, { method: "DELETE" });
      if (!res.ok) {
        const data = (await res.json().catch(() => null)) as { error?: string } | null;
        throw new Error(data?.error ?? "Silme başarısız.");
      }
      await refresh();
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("Ürün silinemedi.");
      }
      return;
    }

    if (editingSlug === slug) {
      setForm(emptyForm());
      setEditingSlug(null);
    }
  }

  async function onUploadFiles(fileList: FileList | null) {
    const files = fileList ? Array.from(fileList) : [];
    if (files.length === 0) return;

    setUploading(true);
    setError(null);
    try {
      const fd = new FormData();
      files.forEach((file) => fd.append("files", file));
      const res = await fetch("/api/admin/products/upload", { method: "POST", body: fd });
      const data = (await res.json()) as { url?: string; urls?: string[]; error?: string };
      const uploadedUrls = normalizeImageUrls(
        Array.isArray(data.urls) ? data.urls : data.url ? [data.url] : [],
      );

      if (!res.ok || uploadedUrls.length === 0) {
        setError(data.error ?? "Görsel yüklenemedi.");
        return;
      }
      setForm((prev) => {
        const merged = normalizeImageUrls([...prev.images, ...uploadedUrls]);
        return {
          ...prev,
          images: merged,
          image: merged[0] ?? "",
        };
      });
    } catch {
      setError("Görsel yüklenemedi.");
    } finally {
      setUploading(false);
    }
  }

  return (
    <section className="mx-auto w-full max-w-7xl px-4 py-10 md:px-8">
      <div className="mb-6 overflow-hidden rounded-3xl border border-[#D4AF37]/30 bg-[linear-gradient(135deg,rgba(212,175,55,0.18),rgba(26,26,26,0.9)_34%,rgba(8,8,8,0.95))] p-6 shadow-[0_20px_55px_rgba(0,0,0,0.38)]">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-xs tracking-[0.24em] text-[#F3D47B]">PRODUCT OPS</p>
            <h1 className="mt-2 text-3xl font-semibold text-zinc-100">Ürün ve Stok Yönetimi</h1>
            <p className="mt-2 text-sm text-zinc-300">
              Katalogu, kaplama seçeneklerini ve stok adetlerini tek panelden canlı yönet.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="rounded-full border border-[#D4AF37]/40 bg-black/35 px-3 py-1 text-xs text-zinc-200">
              Stok Sağlığı: %{stockHealth}
            </span>
            <Link
              href="/admin/panel"
              className="rounded-xl border border-[#D4AF37]/45 bg-black/30 px-4 py-2 text-sm font-semibold text-[#D4AF37] transition hover:bg-[#D4AF37] hover:text-black"
            >
              Dashboard&apos;a Dön
            </Link>
          </div>
        </div>
      </div>

      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-2xl border border-[#D4AF37]/25 bg-[linear-gradient(145deg,rgba(212,175,55,0.16),rgba(24,24,24,0.75))] p-5">
          <p className="text-xs tracking-[0.22em] text-[#F3D47B]">ÜRÜN SAYISI</p>
          <p className="mt-2 text-3xl font-semibold text-zinc-100">{loading ? "…" : products.length}</p>
        </div>
        <div className="rounded-2xl border border-[#D4AF37]/25 bg-zinc-900/60 p-5">
          <p className="text-xs tracking-[0.22em] text-[#D4AF37]">TOPLAM STOK</p>
          <p className="mt-2 text-3xl font-semibold text-zinc-100">{loading ? "…" : inventoryStats.totalStock}</p>
        </div>
        <div className="rounded-2xl border border-amber-400/30 bg-amber-500/10 p-5">
          <p className="text-xs tracking-[0.22em] text-amber-200">KRİTİK STOK</p>
          <p className="mt-2 text-3xl font-semibold text-amber-100">{loading ? "…" : inventoryStats.lowStock}</p>
        </div>
        <div className="rounded-2xl border border-red-400/30 bg-red-500/10 p-5">
          <p className="text-xs tracking-[0.22em] text-red-200">TÜKENEN</p>
          <p className="mt-2 text-3xl font-semibold text-red-100">{loading ? "…" : inventoryStats.outOfStock}</p>
        </div>
      </div>

      <div className="mb-6 rounded-2xl border border-[#D4AF37]/20 bg-zinc-900/55 p-4">
        <div className="mb-2 flex items-center justify-between">
          <p className="text-xs tracking-[0.18em] text-zinc-400">KATEGORİ DAĞILIMI</p>
          <p className="text-xs text-zinc-500">{products.length} toplam ürün</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {categoryStats.map((item) => (
            <span
              key={item.category}
              className="inline-flex items-center gap-2 rounded-full border border-[#D4AF37]/25 bg-black/30 px-3 py-1 text-xs text-zinc-200"
            >
              <span>{item.category}</span>
              <span className="rounded-full border border-[#D4AF37]/35 px-1.5 py-0.5 text-[10px] text-[#D4AF37]">
                {item.count}
              </span>
            </span>
          ))}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <form
          onSubmit={onSubmit}
          className="rounded-3xl border border-[#D4AF37]/25 bg-[linear-gradient(155deg,rgba(28,28,28,0.9),rgba(10,10,10,0.95))] p-5 shadow-[0_16px_45px_rgba(0,0,0,0.35)]"
        >
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs tracking-[0.22em] text-[#D4AF37]">{editingSlug ? "DÜZENLEME MODU" : "YENİ ÜRÜN"}</p>
              <p className="mt-2 text-sm text-zinc-300">
                {editingSlug ? "Seçili ürünü ve stok bilgisini güncelle." : "Yeni ürün ekle ve stok adedini belirle."}
              </p>
            </div>
            {formPreviewUrl && (
              <div className="rounded-xl border border-[#D4AF37]/20 bg-black/35 p-2 shadow-[0_0_24px_rgba(212,175,55,0.14)]">
                <Image
                  src={formPreviewUrl}
                  alt="Önizleme"
                  width={64}
                  height={64}
                  sizes="64px"
                  className="h-14 w-14 object-contain"
                />
                <p className="mt-1 text-center text-[10px] text-zinc-400">{form.images.length} görsel</p>
              </div>
            )}
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <label className="block text-sm">
              <span className="mb-1 block text-zinc-300">Ad</span>
              <input
                required
                value={form.name}
                onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
                className={fieldClass}
              />
            </label>

            <label className="block text-sm">
              <span className="mb-1 block text-zinc-300">Slug (isteğe bağlı)</span>
              <input
                value={form.slug}
                onChange={(e) => setForm((prev) => ({ ...prev, slug: e.target.value }))}
                placeholder="orn. nova-kunye"
                className={fieldClass}
              />
            </label>

            <label className="block text-sm">
              <span className="mb-1 block text-zinc-300">Kategori</span>
              <select
                value={form.category}
                onChange={(e) => setForm((prev) => ({ ...prev, category: e.target.value as ProductCategory }))}
                className={fieldClass}
              >
                {categories.map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>
            </label>

            <label className="block text-sm">
              <span className="mb-1 block text-zinc-300">Fiyat (TL)</span>
              <input
                required
                value={form.price}
                onChange={(e) => setForm((prev) => ({ ...prev, price: e.target.value }))}
                type="number"
                min={0}
                className={fieldClass}
              />
            </label>

            <label className="block text-sm">
              <span className="mb-1 block text-zinc-300">Stok</span>
              <input
                required
                value={form.stock}
                onChange={(e) => setForm((prev) => ({ ...prev, stock: e.target.value }))}
                type="number"
                min={0}
                className={fieldClass}
              />
            </label>

            <label className="block text-sm">
              <span className="mb-1 block text-zinc-300">Hazırlık Süresi (gün)</span>
              <input
                value={form.leadTimeDays}
                onChange={(e) => setForm((prev) => ({ ...prev, leadTimeDays: e.target.value }))}
                type="number"
                min={0}
                className={fieldClass}
              />
            </label>

            <label className="block text-sm md:col-span-2">
              <span className="mb-1 block text-zinc-300">Kısa Açıklama</span>
              <textarea
                required
                value={form.description}
                onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
                rows={3}
                className="w-full resize-none rounded-xl border border-[#D4AF37]/25 bg-black/30 px-3 py-2.5 text-sm outline-none transition focus:border-[#D4AF37] focus:shadow-[0_0_0_3px_rgba(212,175,55,0.14)]"
              />
            </label>

            <label className="block text-sm md:col-span-2">
              <span className="mb-1 block text-zinc-300">Materyal</span>
              <input
                value={form.material}
                onChange={(e) => setForm((prev) => ({ ...prev, material: e.target.value }))}
                className={fieldClass}
              />
            </label>

            <label className="block text-sm md:col-span-2">
              <span className="mb-1 block text-zinc-300">Görseller (Çoklu)</span>
              <div className="grid gap-3 md:grid-cols-[1fr_1fr]">
                <label className="flex cursor-pointer items-center justify-center rounded-xl border border-[#D4AF37]/25 bg-black/20 px-3 py-2 text-sm text-zinc-200 hover:border-[#D4AF37]/60">
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    className="hidden"
                    onChange={(e) => onUploadFiles(e.target.files)}
                  />
                  {uploading ? "Yükleniyor..." : "Dosyaları Seç"}
                </label>
                <button
                  type="button"
                  onClick={() => setFormImages([])}
                  className="rounded-xl border border-red-400/35 bg-red-500/10 px-3 py-2 text-sm text-red-200 transition hover:bg-red-500/20"
                >
                  Tüm Görselleri Temizle
                </button>
              </div>

              <textarea
                value={form.images.join("\n")}
                onChange={(e) => setFormImages(parseImageTextarea(e.target.value))}
                rows={4}
                placeholder={"/uploads/1.png\n/uploads/2.png"}
                className="mt-3 w-full resize-none rounded-xl border border-[#D4AF37]/25 bg-black/30 px-3 py-2.5 text-sm outline-none transition focus:border-[#D4AF37] focus:shadow-[0_0_0_3px_rgba(212,175,55,0.14)]"
              />
              <p className="mt-1 text-xs text-zinc-500">
                Satır başına bir URL gir. İlk satır ürün kartlarında ana görsel olarak kullanılır.
              </p>

              {form.images.length > 0 && (
                <div className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-4">
                  {form.images.map((url, index) => (
                    <div key={`${url}-${index}`} className="rounded-lg border border-[#D4AF37]/20 bg-black/30 p-2">
                      <Image
                        src={normalizeDisplayImageUrl(url)}
                        alt={`Görsel ${index + 1}`}
                        width={300}
                        height={300}
                        sizes="(max-width: 768px) 25vw, 160px"
                        className="h-16 w-full object-contain"
                      />
                      <button
                        type="button"
                        onClick={() => setFormImages(form.images.filter((_, i) => i !== index))}
                        className="mt-2 w-full rounded-md border border-red-400/30 px-2 py-1 text-[11px] text-red-200"
                      >
                        Kaldır
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </label>

            <label className="block text-sm">
              <span className="mb-1 block text-zinc-300">Koleksiyon</span>
              <input
                value={form.collection}
                onChange={(e) => setForm((prev) => ({ ...prev, collection: e.target.value }))}
                className={fieldClass}
              />
            </label>

            <label className="block text-sm">
              <span className="mb-1 block text-zinc-300">Yüzey / Finish</span>
              <input
                value={form.finish}
                onChange={(e) => setForm((prev) => ({ ...prev, finish: e.target.value }))}
                className={fieldClass}
              />
            </label>

            <label className="block text-sm md:col-span-2">
              <span className="mb-1 block text-zinc-300">Etiketler (virgülle)</span>
              <input
                value={form.tags}
                onChange={(e) => setForm((prev) => ({ ...prev, tags: e.target.value }))}
                placeholder="Minimal, Yeni Sezon"
                className={fieldClass}
              />
            </label>

            <label className="block text-sm md:col-span-2">
              <span className="mb-1 block text-zinc-300">SEO Keywords (virgülle)</span>
              <input
                value={form.seoKeywords}
                onChange={(e) => setForm((prev) => ({ ...prev, seoKeywords: e.target.value }))}
                placeholder="pirinç takı, atelier, lüks kolye"
                className={fieldClass}
              />
            </label>

            <div className="md:col-span-2 rounded-2xl border border-[#D4AF37]/20 bg-black/25 p-4">
              <label className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={form.hasCoating}
                  onChange={(e) => setCoatingEnabled(e.target.checked)}
                />
                <span className="text-sm text-zinc-200">Kaplama seçeneği aktif</span>
              </label>

              {form.hasCoating && (
                <div className="mt-3 space-y-3">
                  {form.coatingOptions.map((option, index) => (
                    <div key={`${option.id}-${index}`} className="grid gap-2 rounded-xl border border-[#D4AF37]/15 bg-black/25 p-3 md:grid-cols-[1fr_120px_auto]">
                      <input
                        value={option.name}
                        onChange={(e) => {
                          const value = e.target.value;
                          updateCoatingRow(index, {
                            name: value,
                            id: normalizeCoatingId(value) || option.id,
                          });
                        }}
                        placeholder="Kaplama Türü (örn. 22K Altın)"
                        className="rounded-xl border border-[#D4AF37]/25 bg-black/30 px-3 py-2 text-sm outline-none transition focus:border-[#D4AF37]"
                      />
                      <input
                        value={option.priceDelta}
                        onChange={(e) => updateCoatingRow(index, { priceDelta: e.target.value })}
                        type="number"
                        min={0}
                        placeholder="+ Fiyat"
                        className="rounded-xl border border-[#D4AF37]/25 bg-black/30 px-3 py-2 text-sm outline-none transition focus:border-[#D4AF37]"
                      />
                      <button
                        type="button"
                        onClick={() => removeCoatingRow(index)}
                        className="rounded-xl border border-red-400/35 bg-red-500/10 px-3 py-2 text-xs font-semibold text-red-200"
                      >
                        Sil
                      </button>
                    </div>
                  ))}

                  <button
                    type="button"
                    onClick={addCoatingRow}
                    className="rounded-xl border border-[#D4AF37]/40 bg-black/25 px-4 py-2 text-xs font-semibold text-[#D4AF37] transition hover:bg-[#D4AF37] hover:text-black"
                  >
                    Kaplama Satırı Ekle
                  </button>
                </div>
              )}
            </div>
          </div>

          <div className="mt-4 grid gap-3 md:grid-cols-2">
            <label className="flex items-center gap-3 rounded-2xl border border-[#D4AF37]/20 bg-black/20 p-3">
              <input
                type="checkbox"
                checked={form.isNew}
                onChange={(e) => setForm((prev) => ({ ...prev, isNew: e.target.checked }))}
              />
              <span className="text-sm text-zinc-200">Yeni</span>
            </label>
            <label className="flex items-center gap-3 rounded-2xl border border-[#D4AF37]/20 bg-black/20 p-3">
              <input
                type="checkbox"
                checked={form.isLimited}
                onChange={(e) => setForm((prev) => ({ ...prev, isLimited: e.target.checked }))}
              />
              <span className="text-sm text-zinc-200">Limited</span>
            </label>
          </div>

          {error && <div className="mt-4 rounded-2xl border border-red-400/30 bg-red-950/20 p-4 text-red-200">{error}</div>}

          <div className="mt-5 flex flex-wrap gap-3">
            <button
              type="submit"
              className="rounded-xl border border-[#D4AF37] bg-[#D4AF37] px-6 py-3 text-sm font-semibold text-black transition hover:bg-transparent hover:text-[#D4AF37]"
            >
              {editingSlug ? "Güncelle" : "Kaydet"}
            </button>
            {editingSlug && (
              <button
                type="button"
                onClick={() => {
                  setForm(emptyForm());
                  setEditingSlug(null);
                }}
                className="rounded-xl border border-[#D4AF37]/40 bg-black/20 px-6 py-3 text-sm font-semibold text-[#D4AF37] transition hover:bg-[#D4AF37] hover:text-black"
              >
                İptal
              </button>
            )}
          </div>
        </form>

        <div className="rounded-3xl border border-[#D4AF37]/25 bg-[linear-gradient(155deg,rgba(28,28,28,0.9),rgba(10,10,10,0.95))] p-5 shadow-[0_16px_45px_rgba(0,0,0,0.35)]">
          <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="text-xs tracking-[0.2em] text-[#D4AF37]">ENVENTER LİSTESİ</p>
              <p className="mt-1 text-sm font-semibold text-zinc-100">Mevcut Ürünler</p>
              <p className="text-xs text-zinc-400">Stok durumuna göre sıralanır</p>
            </div>
            <p className="text-xs text-zinc-400">{products.length} kayıt</p>
          </div>

          <div className="mb-4">
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Ürün ara: ad, slug, koleksiyon"
              className={fieldClass}
            />
          </div>

          <div className="mb-4 grid gap-3 md:grid-cols-[1fr_auto]">
            <label className="block text-sm">
              <span className="mb-1 block text-xs tracking-[0.18em] text-zinc-400">Koleksiyon</span>
              <select
                value={collectionFilter}
                onChange={(e) => setCollectionFilter(e.target.value)}
                className={fieldClass}
              >
                {collectionOptions.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </label>
            <button
              type="button"
              onClick={() => {
                setCollectionFilter("Tümü");
                setQuery("");
              }}
              className="self-end rounded-xl border border-[#D4AF37]/35 px-4 py-2 text-sm text-[#D4AF37] transition hover:bg-[#D4AF37]/10"
            >
              Filtreyi Temizle
            </button>
          </div>

          <div className="mb-4 rounded-2xl border border-[#D4AF37]/18 bg-black/20 p-4">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
              <p className="text-xs tracking-[0.18em] text-[#D4AF37]">
                Toplu İşlem {selectedProductIds.length > 0 ? `(${selectedProductIds.length})` : ""}
              </p>
              <button
                type="button"
                onClick={() =>
                  setSelectedProductIds(
                    selectedProductIds.length === filteredProducts.length
                      ? []
                      : filteredProducts.map((product) => product.id),
                  )
                }
                className="text-xs text-zinc-400 transition hover:text-[#D4AF37]"
              >
                {selectedProductIds.length === filteredProducts.length ? "Seçimi Kaldır" : "Hepsini Seç"}
              </button>
            </div>
            <div className="grid gap-3 lg:grid-cols-[1fr_1fr_auto_auto]">
              <input
                value={bulkPrice}
                onChange={(e) => setBulkPrice(e.target.value)}
                type="number"
                min={0}
                placeholder="Toplu fiyat"
                className={fieldClass}
              />
              <input
                value={bulkStock}
                onChange={(e) => setBulkStock(e.target.value)}
                type="number"
                min={0}
                placeholder="Toplu stok"
                className={fieldClass}
              />
              <button
                type="button"
                onClick={() => void applyBulkUpdate("price")}
                className="rounded-xl border border-[#D4AF37]/35 px-4 py-2 text-sm text-[#D4AF37] transition hover:bg-[#D4AF37]/10"
              >
                Fiyat Güncelle
              </button>
              <button
                type="button"
                onClick={() => void applyBulkUpdate("stock")}
                className="rounded-xl border border-[#D4AF37] bg-[#D4AF37] px-4 py-2 text-sm font-semibold text-black transition hover:bg-transparent hover:text-[#D4AF37]"
              >
                Stok Güncelle
              </button>
            </div>
          </div>

          {loading ? (
            <div className="py-10 text-center text-zinc-400">Yükleniyor...</div>
          ) : filteredProducts.length === 0 ? (
            <div className="py-10 text-center text-zinc-400">Sonuç bulunamadı.</div>
          ) : (
            <div className="space-y-3">
              {filteredProducts.slice(0, 30).map((product) => {
                const meta = stockMeta(product.stock);
                const selected = selectedProductIds.includes(product.id);
                return (
                <div key={product.slug} className={`rounded-2xl border bg-black/25 p-4 transition hover:border-[#D4AF37]/45 hover:bg-black/35 ${selected ? "border-[#D4AF37]/65 shadow-[0_0_0_1px_rgba(212,175,55,0.35)]" : "border-[#D4AF37]/20"}`}>
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <label className="mb-2 inline-flex items-center gap-2 text-xs text-zinc-400">
                          <input
                            type="checkbox"
                            checked={selected}
                            onChange={() => toggleSelectedProduct(product.id)}
                            className="accent-[#D4AF37]"
                          />
                          Seç
                        </label>
                        <p className="truncate text-sm font-semibold text-zinc-100">{product.name}</p>
                        <p className="mt-1 text-xs text-zinc-400">{product.category} • {product.collection}</p>
                        <p className="mt-2 text-sm font-semibold text-[#D4AF37]">
                          {product.price.toLocaleString("tr-TR")} TL
                        </p>
                        <div className="mt-2 flex flex-wrap items-center gap-2">
                          <span className={`rounded-full border px-2 py-1 text-[10px] ${meta.className}`}>
                            {meta.label}
                          </span>
                          <span className="rounded-full border border-[#D4AF37]/25 bg-black/35 px-2 py-1 text-[10px] text-zinc-200">
                            Stok: {product.stock}
                          </span>
                          <span className="rounded-full border border-[#D4AF37]/25 bg-black/35 px-2 py-1 text-[10px] text-zinc-200">
                            Görsel: {product.images?.length ?? (product.image ? 1 : 0)}
                          </span>
                          {product.coatingOptions && product.coatingOptions.length > 0 && (
                            <span className="rounded-full border border-[#D4AF37]/35 bg-black/35 px-2 py-1 text-[10px] text-[#D4AF37]">
                              Kaplama +{product.coatingOptions.length}
                            </span>
                          )}
                        </div>
                        <p className="mt-2 text-xs text-zinc-500">/products/{product.slug}</p>
                      </div>

                      <div className="flex flex-col gap-2">
                        <button
                          type="button"
                          onClick={() => fillForm(product)}
                          className="rounded-xl border border-[#D4AF37]/40 bg-black/20 px-3 py-2 text-xs font-semibold text-[#D4AF37] transition hover:bg-[#D4AF37] hover:text-black"
                        >
                          Düzenle
                        </button>
                        <button
                          type="button"
                          onClick={() => onDelete(product.slug)}
                          className="rounded-xl border border-red-400/30 bg-red-950/20 px-3 py-2 text-xs font-semibold text-red-200 transition hover:bg-red-400/10"
                        >
                          Sil
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
