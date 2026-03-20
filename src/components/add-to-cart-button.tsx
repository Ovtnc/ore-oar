"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useCart } from "@/components/cart-provider";
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
    setAddedFeedback(true);

    if (feedbackTimerRef.current) {
      clearTimeout(feedbackTimerRef.current);
    }
    feedbackTimerRef.current = setTimeout(() => {
      setAddedFeedback(false);
    }, 1200);
  }

  return (
    <div className="space-y-4">
      {hasCoatingOptions && (
        <label className="block text-sm">
          <span className="mb-1 block text-zinc-300">Kaplama Seçeneği</span>
          <select
            value={selectedCoatingId}
            onChange={(e) => setSelectedCoatingId(e.target.value)}
            className="w-full rounded-lg border border-[#D4AF37]/30 bg-black/40 px-3 py-2 text-sm outline-none focus:border-[#D4AF37]"
          >
            <option value="">Kaplama Yok (+0 TL)</option>
            {coatingOptions.map((option) => (
              <option key={option.id} value={option.id}>
                {option.name} (+{option.priceDelta.toLocaleString("tr-TR")} TL)
              </option>
            ))}
          </select>
        </label>
      )}

      <div className="rounded-xl border border-[#D4AF37]/20 bg-black/30 p-3">
        <p className="text-xs tracking-[0.2em] text-zinc-400">SEÇİLEN FİYAT</p>
        <p className="mt-1 text-xl font-semibold text-[#D4AF37]">{finalPrice.toLocaleString("tr-TR")} TL</p>
        <p className="mt-1 text-xs text-zinc-400">
          Stok: {stock > 0 ? `${stock} adet` : "Tükendi"}
        </p>
      </div>

      <button
        type="button"
        onClick={handleAddToCart}
        disabled={stock <= 0}
        className={`rounded border px-6 py-3 text-sm font-semibold transition disabled:cursor-not-allowed disabled:border-zinc-600 disabled:bg-zinc-700 disabled:text-zinc-300 ${
          addedFeedback
            ? "border-emerald-300 bg-emerald-300 text-black"
            : "border-[#D4AF37] bg-[#D4AF37] text-black hover:bg-transparent hover:text-[#D4AF37]"
        }`}
      >
        {stock <= 0 ? "Stokta Yok" : addedFeedback ? "Sepete Eklendi ✓" : "Sepete Ekle"}
      </button>
    </div>
  );
}
