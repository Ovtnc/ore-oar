"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { AddToCartButton } from "@/components/add-to-cart-button";
import { Product } from "@/lib/types";

type ProductCardProps = {
  product: Product;
  size?: "md" | "lg";
  enableQuickView?: boolean;
};

function QuickViewModal({
  product,
  onClose,
}: {
  product: Product;
  onClose: () => void;
}) {
  const [selectedImage, setSelectedImage] = useState(0);

  const galleryImages = useMemo(() => {
    const source = [
      ...(product.images ?? []),
      ...(product.image ? [product.image] : []),
    ];
    const cleaned = source.map((image) => image.trim()).filter(Boolean);
    return Array.from(new Set(cleaned)).slice(0, 6);
  }, [product.image, product.images]);

  const activeImage = galleryImages[selectedImage] || "/logo.png";

  useEffect(() => {
    function onEsc(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }

    document.addEventListener("keydown", onEsc);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", onEsc);
      document.body.style.overflow = previousOverflow;
    };
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/75 px-4 py-8 backdrop-blur-sm">
      <div className="relative w-full max-w-4xl overflow-hidden rounded-2xl border border-[#D4AF37]/35 bg-[linear-gradient(145deg,rgba(20,20,20,0.97),rgba(8,8,8,0.98))] shadow-[0_20px_60px_rgba(0,0,0,0.55)]">
        <button
          type="button"
          onClick={onClose}
          className="absolute right-3 top-3 z-10 rounded-full border border-[#D4AF37]/35 bg-black/60 px-3 py-1 text-xs font-semibold text-[#F3D47B] transition hover:border-[#D4AF37]"
        >
          Kapat
        </button>

        <div className="grid gap-6 p-5 md:grid-cols-[1fr_0.9fr] md:p-6">
          <div>
            <div className="relative min-h-[320px] overflow-hidden rounded-xl border border-[#D4AF37]/20 bg-black/40">
              <Image
                src={activeImage}
                alt={product.name}
                fill
                sizes="(max-width: 768px) 100vw, (max-width: 1200px) 55vw, 46vw"
                className="object-cover"
                loading="eager"
                fetchPriority="high"
              />
            </div>

            {galleryImages.length > 1 && (
              <div className="mt-3 grid grid-cols-4 gap-2">
                {galleryImages.map((image, index) => (
                  <button
                    key={`${image}-${index}`}
                    type="button"
                    onClick={() => setSelectedImage(index)}
                    className={`relative min-h-16 overflow-hidden rounded-lg border transition ${
                      selectedImage === index
                        ? "border-[#D4AF37]/65"
                        : "border-[#D4AF37]/20 hover:border-[#D4AF37]/45"
                    }`}
                  >
                    <Image
                      src={image}
                      alt={`${product.name} küçük görsel ${index + 1}`}
                      fill
                      sizes="(max-width: 768px) 22vw, 96px"
                      className="object-cover"
                      loading="lazy"
                      fetchPriority="low"
                    />
                  </button>
                ))}
              </div>
            )}
          </div>

          <div>
            <p className="text-xs tracking-[0.2em] text-[#D4AF37]">{product.category}</p>
            <h3 className="mt-2 text-3xl font-semibold text-zinc-100">{product.name}</h3>
            <p className="mt-2 text-sm text-zinc-300">{product.description}</p>
            <p className="mt-4 text-2xl font-semibold text-[#F3D47B]">
              {product.price.toLocaleString("tr-TR")} TL
            </p>

            <div className="my-4 grid gap-2 text-xs text-zinc-300">
              <p className="rounded-lg border border-[#D4AF37]/20 bg-black/35 px-3 py-2">
                Materyal: {product.material}
              </p>
              <p className="rounded-lg border border-[#D4AF37]/20 bg-black/35 px-3 py-2">
                Hazırlık: {product.leadTimeDays} gün
              </p>
            </div>

            <AddToCartButton
              productId={product.id}
              basePrice={product.price}
              stock={product.stock}
              coatingOptions={product.coatingOptions}
            />

            <Link
              href={`/products/${product.slug}`}
              onClick={onClose}
              className="mt-4 inline-flex items-center rounded-lg border border-[#D4AF37]/45 px-3 py-2 text-xs font-semibold text-[#D4AF37] transition hover:bg-[#D4AF37]/10"
            >
              Tüm Detaya Git →
            </Link>
          </div>
        </div>
      </div>

      <button type="button" aria-label="Modalı kapat" onClick={onClose} className="absolute inset-0 -z-10" />
    </div>
  );
}

export function ProductCard({
  product,
  size = "md",
  enableQuickView = false,
}: ProductCardProps) {
  const mediaHeight = size === "lg" ? "h-64" : "h-56";
  const primaryImage = product.image || product.images?.[0] || "/logo.png";
  const secondaryImage = product.images?.[1] || null;
  const hasCoatingOption = (product.coatingOptions?.length ?? 0) > 0;
  const [quickViewOpen, setQuickViewOpen] = useState(false);

  const stockState =
    product.stock <= 0 ? "Tükendi" : product.stock <= 5 ? `Son ${product.stock} adet` : `${product.stock} stok`;

  return (
    <>
      <article className="product-card group relative block overflow-hidden rounded-2xl border border-[#D4AF37]/20 bg-[linear-gradient(155deg,rgba(24,24,24,0.92),rgba(8,8,8,0.96))] shadow-[0_14px_34px_rgba(0,0,0,0.34)]">
        <div className={`product-media ${mediaHeight} relative border-b border-[#D4AF37]/20`}>
          <Link href={`/products/${product.slug}`} aria-label={`${product.name} detay`} className="absolute inset-0 z-[1]" />

          <Image
            src={primaryImage}
            alt={product.name}
            fill
            sizes={
              size === "lg"
                ? "(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                : "(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
            }
            className={`object-cover transition duration-500 ${
              secondaryImage ? "opacity-100 group-hover:opacity-0" : "group-hover:scale-[1.06]"
            }`}
            loading="lazy"
            fetchPriority="low"
          />

          {secondaryImage && (
            <Image
              src={secondaryImage}
              alt={`${product.name} alternatif görsel`}
              fill
              sizes={
                size === "lg"
                  ? "(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                  : "(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
              }
              className="object-cover opacity-0 transition-opacity duration-500 group-hover:opacity-100"
              loading="lazy"
              fetchPriority="low"
            />
          )}

          <div className="absolute left-3 top-3 z-10 rounded-full border border-[#D4AF37]/60 bg-black/55 px-3 py-1 text-[10px] tracking-[0.18em] text-[#f3d47b]">
            {product.category}
          </div>

          <div className="absolute right-3 top-3 z-10 flex gap-2">
            {product.isNew && (
              <span className="rounded-full border border-[#D4AF37]/55 bg-black/65 px-2 py-1 text-[10px] font-semibold text-[#D4AF37]">
                YENİ
              </span>
            )}
            {product.isLimited && (
              <span className="rounded-full border border-zinc-500 bg-black/65 px-2 py-1 text-[10px] font-semibold text-zinc-200">
                LİMİTED
              </span>
            )}
          </div>

          {enableQuickView && (
            <button
              type="button"
              onClick={(event) => {
                event.preventDefault();
                event.stopPropagation();
                setQuickViewOpen(true);
              }}
              className="absolute bottom-14 right-3 z-20 rounded-lg border border-[#D4AF37]/55 bg-black/65 px-3 py-1.5 text-[11px] font-semibold text-[#F3D47B] opacity-0 transition group-hover:opacity-100 hover:bg-black/85"
            >
              Hızlı Bakış
            </button>
          )}

          <div className="absolute bottom-3 left-3 right-3 z-10 flex items-center justify-between rounded-xl border border-[#D4AF37]/20 bg-black/45 px-3 py-2 text-[11px] text-zinc-200 backdrop-blur">
            <span>{stockState}</span>
            <span>{product.leadTimeDays} gün hazırlık</span>
          </div>
        </div>

        <div className="relative z-10 p-5">
          <Link href={`/products/${product.slug}`} className="inline-block">
            <h3 className="text-2xl text-zinc-100">{product.name}</h3>
          </Link>
          <p className="product-desc mt-2 text-sm text-zinc-400">{product.description}</p>

          <div className="mt-3 flex flex-wrap gap-2">
            {product.tags.slice(0, 2).map((tag) => (
              <span key={tag} className="rounded-full border border-[#D4AF37]/20 bg-black/40 px-2 py-1 text-[11px] text-zinc-300">
                #{tag}
              </span>
            ))}
            {hasCoatingOption && (
              <span className="rounded-full border border-[#D4AF37]/30 bg-black/45 px-2 py-1 text-[11px] text-[#D4AF37]">
                Kaplama Opsiyonu
              </span>
            )}
          </div>

          <div className="mt-4 flex items-center justify-between">
            <p className="text-sm font-semibold text-[#f3d47b]">{product.price.toLocaleString("tr-TR")} TL</p>
            <Link
              href={`/products/${product.slug}`}
              className="product-button rounded-lg border border-[#D4AF37]/45 px-3 py-2 text-xs font-semibold text-[#D4AF37]"
            >
              Detayı Gör →
            </Link>
          </div>

          <div className="mt-3 flex items-center justify-between border-t border-[#D4AF37]/18 pt-2 text-[11px] text-zinc-400">
            <span>Tahmini Hazırlık: {product.leadTimeDays} Gün</span>
            <span>Kaplama Opsiyonu: Mevcut</span>
          </div>
        </div>
      </article>

      {enableQuickView && quickViewOpen && (
        <QuickViewModal
          product={product}
          onClose={() => setQuickViewOpen(false)}
        />
      )}
    </>
  );
}
