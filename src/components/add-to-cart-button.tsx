"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useCart } from "@/components/cart-provider";
import { trackAddToCart } from "@/lib/analytics";
import { toSafePrice } from "@/lib/price";
import { ProductCoatingOption } from "@/lib/types";

type AddToCartButtonProps = {
  productId: string;
  basePrice: number;
  stock: number;
  coatingOptions?: ProductCoatingOption[];
};

export function AddToCartButton({
  productId,
  basePrice,
  stock,
  coatingOptions = [],
}: AddToCartButtonProps) {
  const { addToCart } = useCart();
  const [selectedCoatingId, setSelectedCoatingId] = useState("");
  const [addedFeedback, setAddedFeedback] = useState(false);
  const feedbackTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const selectedCoating = useMemo(
    () => coatingOptions.find((option) => option.id === selectedCoatingId),
    [coatingOptions, selectedCoatingId],
  );

  const safeBasePrice = toSafePrice(basePrice);
  const safeCoatingDelta = toSafePrice(selectedCoating?.priceDelta);
  const finalPrice = safeBasePrice + safeCoatingDelta;
  const hasCoatingOptions = coatingOptions.length > 0;
  const optionButtonBase =
    "rounded-2xl border px-4 py-3 text-left transition-all duration-500 ease-in-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D4AF37]/45";

  useEffect(() => {
    return () => {
      if (feedbackTimerRef.current) {
        clearTimeout(feedbackTimerRef.current);
      }
    };
  }, []);

  function handleAddToCart() {
    if (stock <= 0) return;
    addToCart(productId, selectedCoatingId || undefined);
    trackAddToCart({
      productId,
      price: finalPrice,
      quantity: 1,
    });
    setAddedFeedback(true);

    if (feedbackTimerRef.current) {
      clearTimeout(feedbackTimerRef.current);
    }
    feedbackTimerRef.current = setTimeout(() => {
      setAddedFeedback(false);
    }, 1200);
  }

  return (
    <div className="space-y-5">
      {hasCoatingOptions && (
        <div className="space-y-2">
          <p className="text-sm text-zinc-300">Kaplama Seçeneği</p>
          <div className="grid gap-2 sm:grid-cols-2">
            <button
              type="button"
              onClick={() => setSelectedCoatingId("")}
              className={`${optionButtonBase} ${
                selectedCoatingId === ""
                  ? "border-[#D4AF37]/65 bg-[#D4AF37]/10 text-[#F3D47B] shadow-[0_0_24px_rgba(212,175,55,0.18)]"
                  : "border-zinc-800/80 bg-black/25 text-zinc-300 hover:border-[#D4AF37]/35 hover:bg-black/40"
              }`}
              aria-pressed={selectedCoatingId === ""}
            >
              <span className="block text-sm font-medium">Kaplama Yok</span>
              <span className="mt-1 block text-xs text-zinc-400">+0 TL</span>
            </button>

            {coatingOptions.map((option) => {
              const selected = selectedCoatingId === option.id;
              return (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => setSelectedCoatingId(option.id)}
                  className={`${optionButtonBase} ${
                    selected
                      ? "border-[#D4AF37]/65 bg-[#D4AF37]/10 text-[#F3D47B] shadow-[0_0_24px_rgba(212,175,55,0.18)]"
                      : "border-zinc-800/80 bg-black/25 text-zinc-300 hover:border-[#D4AF37]/35 hover:bg-black/40"
                  }`}
                  aria-pressed={selected}
                >
                  <span className="block text-sm font-medium">{option.name}</span>
                  <span className="mt-1 block text-xs text-zinc-400">
                    +{option.priceDelta.toLocaleString("tr-TR")} TL
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      <div className="rounded-2xl border border-zinc-800/80 bg-zinc-950/40 p-4">
        <p className="text-[11px] uppercase tracking-[0.22em] text-zinc-500">Seçilen Fiyat</p>
        <p className="mt-2 text-2xl font-semibold text-[#D4AF37]">{finalPrice.toLocaleString("tr-TR")} TL</p>
        <p className="mt-1 text-xs text-zinc-500">Stok: {stock > 0 ? `${stock} adet` : "Tükendi"}</p>
      </div>

      <button
        type="button"
        onClick={handleAddToCart}
        disabled={stock <= 0}
        className={`w-full rounded-2xl px-6 py-4 text-sm font-semibold transition-all duration-500 ease-in-out disabled:cursor-not-allowed disabled:border-zinc-600 disabled:bg-zinc-700 disabled:text-zinc-300 ${
          addedFeedback
            ? "border-emerald-300 bg-emerald-300 text-black"
            : "border-[#D4AF37] bg-[#D4AF37] text-black hover:shadow-[0_0_24px_rgba(212,175,55,0.28)]"
        }`}
      >
        {stock <= 0 ? "Stokta Yok" : addedFeedback ? "Sepete Eklendi ✓" : "Sepete Ekle"}
      </button>
    </div>
  );
}
