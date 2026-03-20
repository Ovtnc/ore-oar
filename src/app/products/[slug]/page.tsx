import Link from "next/link";
import { notFound } from "next/navigation";
import { AddToCartButton } from "@/components/add-to-cart-button";
import { ProductImageGallery } from "@/components/product-image-gallery";
import { fetchProductBySlug, fetchProducts } from "@/lib/db-products";

export const dynamic = "force-dynamic";

const productPromises = [
  "Siparişe özel üretim",
  "El polisajı sonlandırma",
  "2-5 gün hazırlık",
];

export default async function ProductDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const product = await fetchProductBySlug(slug);

  if (!product) {
    notFound();
  }

  const allProducts = await fetchProducts();
  const relatedProducts = allProducts
    .filter((item) => item.category === product.category && item.id !== product.id)
    .slice(0, 3);
  const galleryImages = Array.from(
    new Set(
      [
        ...(product.images ?? []),
        ...String(product.image ?? "")
          .split(/[\n,]/)
          .map((item) => item.trim()),
      ].filter(Boolean),
    ),
  );

  return (
    <section className="mx-auto w-full max-w-6xl px-4 py-10 md:px-8">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <Link href="/products" className="text-sm text-[#D4AF37] transition hover:text-[#f3d47b]">
          ← Koleksiyona dön
        </Link>
        <div className="flex flex-wrap gap-2">
          {productPromises.map((item) => (
            <span key={item} className="lux-pill px-3 py-1 text-[11px] tracking-[0.15em] text-zinc-300">
              {item}
            </span>
          ))}
        </div>
      </div>

      <div className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr]">
        <ProductImageGallery name={product.name} images={galleryImages} />

        <aside className="rounded-2xl border border-[#D4AF37]/25 bg-zinc-900/65 p-6 lg:sticky lg:top-24">
          <div className="mb-4 flex flex-wrap gap-2">
            <span className="rounded-full border border-[#D4AF37]/40 px-3 py-1 text-xs text-[#D4AF37]">
              {product.category}
            </span>
            <span className="rounded-full border border-zinc-600 px-3 py-1 text-xs text-zinc-300">
              {product.collection}
            </span>
            {product.isNew && (
              <span className="rounded-full border border-[#D4AF37]/40 px-3 py-1 text-xs text-[#D4AF37]">
                Yeni
              </span>
            )}
            {product.isLimited && (
              <span className="rounded-full border border-zinc-500 px-3 py-1 text-xs text-zinc-300">
                Limited
              </span>
            )}
          </div>

          <h1 className="text-4xl font-semibold text-zinc-100">{product.name}</h1>
          <p className="mt-3 text-zinc-300">{product.description}</p>
          <p className="mt-6 text-3xl font-semibold text-[#D4AF37]">
            {product.price.toLocaleString("tr-TR")} TL
          </p>
          {product.coatingOptions && product.coatingOptions.length > 0 && (
            <p className="mt-1 text-xs text-zinc-400">Kaplama opsiyonları bu fiyata dahil değildir.</p>
          )}

          <div className="my-6 grid gap-3 sm:grid-cols-3">
            <div className="rounded-xl border border-[#D4AF37]/20 bg-black/35 p-3">
              <p className="text-xs text-zinc-400">Materyal</p>
              <p className="mt-1 text-sm text-zinc-100">{product.material}</p>
            </div>
            <div className="rounded-xl border border-[#D4AF37]/20 bg-black/35 p-3">
              <p className="text-xs text-zinc-400">Yüzey</p>
              <p className="mt-1 text-sm text-zinc-100">{product.finish}</p>
            </div>
            <div className="rounded-xl border border-[#D4AF37]/20 bg-black/35 p-3">
              <p className="text-xs text-zinc-400">Hazırlık</p>
              <p className="mt-1 text-sm text-zinc-100">{product.leadTimeDays} gün</p>
            </div>
          </div>

          <div className="mb-6 flex flex-wrap gap-2">
            {product.tags.map((tag) => (
              <span key={tag} className="rounded-full bg-black/45 px-3 py-1 text-xs text-zinc-300">
                #{tag}
              </span>
            ))}
          </div>

          <AddToCartButton
            productId={product.id}
            basePrice={product.price}
            stock={product.stock}
            coatingOptions={product.coatingOptions}
          />
          <p className="mt-3 text-xs text-zinc-400">
            Tüm parçalar sipariş üzerine hazırlanır. El işçiliği sebebiyle küçük farklılıklar görülebilir.
          </p>
        </aside>
      </div>

      {relatedProducts.length > 0 && (
        <div className="mt-12">
          <h2 className="mb-4 text-2xl font-semibold text-zinc-100">Benzer Tasarımlar</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {relatedProducts.map((item) => (
              <Link
                key={item.id}
                href={`/products/${item.slug}`}
                className="rounded-xl border border-[#D4AF37]/20 bg-zinc-900/50 p-4 transition hover:border-[#D4AF37]/60"
              >
                <p className="text-xs tracking-[0.2em] text-[#D4AF37]">{item.category}</p>
                <p className="mt-2 text-lg text-zinc-100">{item.name}</p>
                <p className="mt-2 text-sm text-zinc-400">{item.price.toLocaleString("tr-TR")} TL</p>
              </Link>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
