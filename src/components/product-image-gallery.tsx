"use client";

import Image from "next/image";
import { useMemo, useState } from "react";

type ProductImageGalleryProps = {
  name: string;
  images: string[];
};

function ArrowIcon({ direction }: { direction: "left" | "right" }) {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
      {direction === "left" ? <path d="M15 6l-6 6 6 6" /> : <path d="M9 6l6 6-6 6" />}
    </svg>
  );
}

export function ProductImageGallery({ name, images }: ProductImageGalleryProps) {
  const galleryImages = useMemo(
    () => Array.from(new Set(images.map((item) => item.trim()).filter(Boolean))),
    [images],
  );
  const [selectedIndex, setSelectedIndex] = useState(0);
  const hasMultiple = galleryImages.length > 1;
  const activeIndex = Math.min(selectedIndex, Math.max(galleryImages.length - 1, 0));
  const activeImage = galleryImages[activeIndex] || "/logo.png";

  function goPrev() {
    if (!hasMultiple) return;
    setSelectedIndex((prev) => (prev === 0 ? galleryImages.length - 1 : prev - 1));
  }

  function goNext() {
    if (!hasMultiple) return;
    setSelectedIndex((prev) => (prev === galleryImages.length - 1 ? 0 : prev + 1));
  }

  return (
    <div className="space-y-4">
      <div className="overflow-hidden rounded-2xl border border-[#D4AF37]/30 bg-gradient-to-br from-zinc-800 to-zinc-950 p-6 md:p-8">
        <div className="relative flex min-h-[420px] items-center justify-center">
          <Image
            src={activeImage}
            alt={`${name} - ${activeIndex + 1}. görsel`}
            fill
            sizes="(max-width: 1024px) 100vw, 50vw"
            className="object-contain"
            priority
            unoptimized
          />

          {hasMultiple && (
            <>
              <button
                type="button"
                onClick={goPrev}
                className="absolute left-3 top-1/2 -translate-y-1/2 rounded-full border border-[#D4AF37]/45 bg-black/55 p-2 text-[#F3D47B] transition hover:border-[#D4AF37] hover:bg-black/75"
                aria-label="Önceki görsel"
              >
                <ArrowIcon direction="left" />
              </button>
              <button
                type="button"
                onClick={goNext}
                className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full border border-[#D4AF37]/45 bg-black/55 p-2 text-[#F3D47B] transition hover:border-[#D4AF37] hover:bg-black/75"
                aria-label="Sonraki görsel"
              >
                <ArrowIcon direction="right" />
              </button>
            </>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {galleryImages.map((image, index) => {
          const active = index === activeIndex;
          return (
            <button
              key={`${image}-${index}`}
              type="button"
              onClick={() => setSelectedIndex(index)}
              className={`relative min-h-24 overflow-hidden rounded-xl border bg-zinc-900/60 text-left transition ${
                active
                  ? "border-[#D4AF37]/65 ring-2 ring-[#D4AF37]/25"
                  : "border-[#D4AF37]/20 hover:border-[#D4AF37]/45"
              }`}
              aria-label={`${index + 1}. görseli seç`}
            >
              <Image
                src={image}
                alt={`${name} - küçük görsel ${index + 1}`}
                fill
                sizes="(max-width: 768px) 50vw, 160px"
                className="object-contain p-3 opacity-90"
                unoptimized
              />
            </button>
          );
        })}
      </div>
    </div>
  );
}
