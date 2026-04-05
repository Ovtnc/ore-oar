"use client";

import { useEffect, useRef, useState } from "react";
import { useCart } from "@/components/cart-provider";
import { trackAddToCart } from "@/lib/analytics";

type MobileStickyAddToCartProps = {
  productId: string;
  productName: string;
  price: number;
  stock: number;
};

export function MobileStickyAddToCart({
  productId,
  productName,
  price,
  stock,
}: MobileStickyAddToCartProps) {
  const { addToCart } = useCart();
  const [visible, setVisible] = useState(false);
  const [addedFeedback, setAddedFeedback] = useState(false);
  const feedbackTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const onScroll = () => {
      setVisible(window.scrollY > 280);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      if (feedbackTimerRef.current) {
        clearTimeout(feedbackTimerRef.current);
      }
    };
  }, []);

  function handleAddToCart() {
    if (stock <= 0) return;
    addToCart(productId);
    trackAddToCart({
      productId,
      price,
      quantity: 1,
    });
    setAddedFeedback(true);
    if (feedbackTimerRef.current) clearTimeout(feedbackTimerRef.current);
    feedbackTimerRef.current = setTimeout(() => setAddedFeedback(false), 1200);
  }

  return (
    <div
      className={`fixed inset-x-0 bottom-0 z-40 border-t border-[#D4AF37]/25 bg-black/80 px-4 py-3 backdrop-blur-md transition-all duration-300 lg:hidden ${
        visible ? "translate-y-0 opacity-100" : "pointer-events-none translate-y-full opacity-0"
      }`}
    >
      <div className="mx-auto flex w-full max-w-6xl items-center gap-3">
        <div className="min-w-0 flex-1">
          <p className="truncate text-xs tracking-[0.14em] text-zinc-300">{productName}</p>
          <p className="text-sm font-semibold text-[#D4AF37]">{price.toLocaleString("tr-TR")} TL</p>
        </div>
        <button
          type="button"
          onClick={handleAddToCart}
          disabled={stock <= 0}
          className={`shrink-0 rounded-lg border px-4 py-2 text-xs font-semibold ${
            addedFeedback
              ? "border-emerald-300 bg-emerald-300 text-black"
              : "border-[#D4AF37] bg-[#D4AF37] text-black"
          } disabled:cursor-not-allowed disabled:border-zinc-600 disabled:bg-zinc-700 disabled:text-zinc-300`}
        >
          {stock <= 0 ? "Stokta Yok" : addedFeedback ? "Eklendi ✓" : "Sepete Ekle"}
        </button>
      </div>
    </div>
  );
}
