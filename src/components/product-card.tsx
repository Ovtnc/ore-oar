import Image from "next/image";
import Link from "next/link";
import { Product } from "@/lib/types";

type ProductCardProps = {
  product: Product;
  size?: "md" | "lg";
};

export function ProductCard({ product, size = "md" }: ProductCardProps) {
  const mediaHeight = size === "lg" ? "h-64" : "h-56";
  const stockState =
    product.stock <= 0 ? "Tükendi" : product.stock <= 5 ? `Son ${product.stock} adet` : `${product.stock} stok`;

  return (
    <Link
      href={`/products/${product.slug}`}
      className="product-card group block rounded-2xl border border-[#D4AF37]/20 bg-[linear-gradient(155deg,rgba(24,24,24,0.92),rgba(8,8,8,0.96))] shadow-[0_14px_34px_rgba(0,0,0,0.34)]"
    >
      <div className={`product-media ${mediaHeight} relative border-b border-[#D4AF37]/20`}>
        <Image
          src={product.image || "/logo.png"}
          alt={product.name}
          fill
          sizes={size === "lg" ? "(max-width: 1024px) 100vw, 33vw" : "(max-width: 1024px) 100vw, 33vw"}
          className="object-contain p-5 transition duration-300 group-hover:scale-[1.06]"
          unoptimized
        />

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

        <div className="absolute bottom-3 left-3 right-3 z-10 flex items-center justify-between rounded-xl border border-[#D4AF37]/20 bg-black/45 px-3 py-2 text-[11px] text-zinc-200 backdrop-blur">
          <span>{stockState}</span>
          <span>{product.leadTimeDays} gün hazırlık</span>
        </div>
      </div>

      <div className="relative z-10 p-5">
        <h3 className="text-2xl text-zinc-100">{product.name}</h3>
        <p className="product-desc mt-2 text-sm text-zinc-400">{product.description}</p>

        <div className="mt-3 flex flex-wrap gap-2">
          {product.tags.slice(0, 2).map((tag) => (
            <span key={tag} className="rounded-full border border-[#D4AF37]/20 bg-black/40 px-2 py-1 text-[11px] text-zinc-300">
              #{tag}
            </span>
          ))}
          {product.coatingOptions && product.coatingOptions.length > 0 && (
            <span className="rounded-full border border-[#D4AF37]/30 bg-black/45 px-2 py-1 text-[11px] text-[#D4AF37]">
              Kaplama Opsiyonu
            </span>
          )}
        </div>

        <div className="mt-4 flex items-center justify-between">
          <p className="text-sm font-semibold text-[#f3d47b]">{product.price.toLocaleString("tr-TR")} TL</p>
          <span className="product-button rounded-lg border border-[#D4AF37]/45 px-3 py-2 text-xs font-semibold text-[#D4AF37]">
            Detayı Gör →
          </span>
        </div>
      </div>
    </Link>
  );
}
