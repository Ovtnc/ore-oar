"use client";

import Image from "next/image";
import { AnimatePresence, motion } from "framer-motion";
import { useMemo, useState } from "react";

type ProductImageGalleryProps = {
  name: string;
  images: string[];
  isNew?: boolean;
  isLimited?: boolean;
};

function ArrowIcon({ direction }: { direction: "left" | "right" }) {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
      {direction === "left" ? <path d="M15 6l-6 6 6 6" /> : <path d="M9 6l6 6-6 6" />}
    </svg>
  );
}

export function ProductImageGallery({ name, images, isNew = false, isLimited = false }: ProductImageGalleryProps) {
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
      <div className="overflow-hidden rounded-2xl border border-zinc-800/70 bg-zinc-900/50 p-4 md:p-6">
        <div className="relative flex min-h-[420px] items-center justify-center">
          <div className="absolute left-3 top-3 z-[3] flex flex-wrap gap-2">
            {isLimited && (
              <span className="rounded-full border border-[#D4AF37]/45 bg-black/55 px-3 py-1 text-[10px] tracking-[0.2em] text-[#F3D47B]">
                LIMITED EDITION
              </span>
            )}
            {isNew && (
              <span className="rounded-full border border-[#D4AF37]/45 bg-black/55 px-3 py-1 text-[10px] tracking-[0.2em] text-[#F3D47B]">
                NEW ARRIVAL
              </span>
            )}
          </div>

          <AnimatePresence mode="wait">
            <motion.div
              key={activeImage}
              initial={{ opacity: 0, y: 10, scale: 0.995 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.45, ease: "easeOut" }}
              className="absolute inset-0"
            >
              <Image
                src={activeImage}
                alt={`${name} - ${activeIndex + 1}. görsel`}
                fill
                sizes="(max-width: 1024px) 100vw, 50vw"
                className="object-cover"
                priority={activeIndex === 0}
                loading={activeIndex === 0 ? "eager" : "lazy"}
                fetchPriority={activeIndex === 0 ? "high" : "auto"}
              />
            </motion.div>
          </AnimatePresence>

          {hasMultiple && (
            <>
              <button
                type="button"
                onClick={goPrev}
                className="absolute left-3 top-1/2 -translate-y-1/2 rounded-full border border-[#D4AF37]/35 bg-black/55 p-2 text-[#F3D47B] transition-all duration-500 ease-in-out hover:border-[#D4AF37] hover:bg-black/75 hover:shadow-[0_0_20px_rgba(212,175,55,0.18)]"
                aria-label="Önceki görsel"
              >
                <ArrowIcon direction="left" />
              </button>
              <button
                type="button"
                onClick={goNext}
                className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full border border-[#D4AF37]/35 bg-black/55 p-2 text-[#F3D47B] transition-all duration-500 ease-in-out hover:border-[#D4AF37] hover:bg-black/75 hover:shadow-[0_0_20px_rgba(212,175,55,0.18)]"
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
              className={`relative min-h-24 overflow-hidden rounded-xl border text-left transition-all duration-500 ease-in-out ${
                active
                  ? "border-[#D4AF37]/55 bg-[#D4AF37]/5 ring-2 ring-[#D4AF37]/20"
                  : "border-zinc-800/80 bg-zinc-900/50 hover:border-[#D4AF37]/35 hover:bg-zinc-900/70"
              }`}
              aria-label={`${index + 1}. görseli seç`}
            >
              <Image
                src={image}
                alt={`${name} - küçük görsel ${index + 1}`}
                fill
                sizes="(max-width: 768px) 50vw, 160px"
                className="object-cover opacity-90"
                loading="lazy"
                fetchPriority="low"
              />
            </button>
          );
        })}
      </div>
    </div>
  );
}
