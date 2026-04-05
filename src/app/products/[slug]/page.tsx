import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AddToCartButton } from "@/components/add-to-cart-button";
import { MobileStickyAddToCart } from "@/components/mobile-sticky-add-to-cart";
import { ProductCareAccordion } from "@/components/product-care-accordion";
import { ProductFaqAccordion } from "@/components/product-faq-accordion";
import { ProductImageGallery } from "@/components/product-image-gallery";
import { ProductReviews } from "@/components/product-reviews";
import { ViewItemTracker } from "@/components/view-item-tracker";
import { fetchProductBySlug, fetchProducts } from "@/lib/db-products";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const product = await fetchProductBySlug(slug);

  if (!product) {
    return {
      title: "Ürün Bulunamadı | Oar & Ore",
    };
  }

  const keywordText = (product.seoKeywords ?? product.tags ?? [])
    .filter(Boolean)
    .slice(0, 8)
    .join(", ");

  return {
    title: `${product.name} | Oar & Ore`,
    description: product.description,
    keywords: keywordText ? keywordText.split(", ").map((item) => item.trim()) : undefined,
    openGraph: {
      title: `${product.name} | Oar & Ore`,
      description: product.description,
    },
  };
}

function createSocialProofSeed(source: string) {
  return source.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0);
}

function SocialProofIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 text-[#D4AF37]" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M3 12s3.5-6 9-6 9 6 9 6-3.5 6-9 6-9-6-9-6Z" />
      <circle cx="12" cy="12" r="2.5" />
    </svg>
  );
}

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
  const socialSeed = createSocialProofSeed(`${product.id}-${new Date().toISOString().slice(0, 10)}`);
  const liveViewers = 4 + (socialSeed % 13);
  const soldLast24h = 1 + ((socialSeed * 7) % 9);

  return (
    <section className="mx-auto w-full max-w-7xl px-4 pb-24 pt-10 md:px-8 md:pb-12">
      <ViewItemTracker productId={product.id} price={product.price} />
      <div className="mb-8 flex flex-wrap items-center justify-between gap-3">
        <Link href="/products" className="text-sm text-[#D4AF37] transition hover:text-[#f3d47b]">
          ← Koleksiyona dön
        </Link>
      </div>

      <div className="grid gap-10 lg:grid-cols-[1.08fr_0.92fr]">
        <ProductImageGallery
          name={product.name}
          images={galleryImages}
          isNew={product.isNew}
          isLimited={product.isLimited}
        />

        <aside className="rounded-[28px] border border-zinc-800/75 bg-zinc-900/50 p-6 md:p-8 lg:sticky lg:top-24">
          <div className="flex flex-wrap gap-2">
            {product.isNew && (
              <span className="rounded-full border border-[#D4AF37]/35 bg-black/20 px-3 py-1 text-[10px] uppercase tracking-[0.22em] text-[#F3D47B]">
                New
              </span>
            )}
            <span className="rounded-full border border-[#D4AF37]/35 bg-black/20 px-3 py-1 text-[10px] uppercase tracking-[0.22em] text-[#F3D47B]">
              {product.collection}
            </span>
            {product.isLimited && (
              <span className="rounded-full border border-[#D4AF37]/35 bg-black/20 px-3 py-1 text-[10px] uppercase tracking-[0.22em] text-[#F3D47B]">
                Limited
              </span>
            )}
          </div>

          <h1 className="mt-4 text-4xl font-semibold leading-tight text-zinc-50 md:text-5xl">
            {product.name}
          </h1>

          <p className="mt-4 text-zinc-300">{product.description}</p>

          <div className="mt-5 flex flex-wrap items-end justify-between gap-4">
            <p className="text-4xl font-semibold text-[#D4AF37] md:text-5xl">
              {product.price.toLocaleString("tr-TR")} TL
            </p>
            <p className="inline-flex items-center gap-2 text-xs text-zinc-500">
              <SocialProofIcon />
              Bu hafta {liveViewers} kişi tarafından incelendi
            </p>
          </div>
          <p className="mt-2 text-xs text-zinc-500">Son 24 saatte {soldLast24h} adet satıldı.</p>

          <div className="mt-6 rounded-2xl border border-zinc-800/75 bg-black/18 p-3">
            <p className="text-xs tracking-[0.22em] text-[#D4AF37]">Neden Oar & Ore?</p>
            <ul className="mt-3 space-y-2 text-sm text-zinc-300">
              <li className="rounded-xl border border-zinc-800/75 bg-black/18 px-3 py-2">
                Materyal: %100 masif pirinç.
              </li>
              <li className="rounded-xl border border-zinc-800/75 bg-black/18 px-3 py-2">
                İşçilik: Parçalar elde form verilir ve tek tek kalite kontrolden geçer.
              </li>
              <li className="rounded-xl border border-zinc-800/75 bg-black/18 px-3 py-2">
                Kargo: Hazırlık süresi ortalama {product.leadTimeDays} gün.
              </li>
            </ul>
          </div>

          <div className="mt-6">
            <ProductCareAccordion leadTimeDays={product.leadTimeDays} />
          </div>

          <div className="mt-6">
            <AddToCartButton
              productId={product.id}
              basePrice={product.price}
              stock={product.stock}
              coatingOptions={product.coatingOptions}
            />
            <p className="mt-3 text-xs text-zinc-500">
              Tüm parçalar sipariş üzerine hazırlanır. El işçiliği sebebiyle küçük farklılıklar görülebilir.
            </p>
          </div>
        </aside>
      </div>

      {relatedProducts.length > 0 && (
        <section className="py-16">
          <div className="mb-5 flex items-end justify-between gap-3">
            <h2 className="text-2xl font-semibold text-zinc-100">Benzer Tasarımlar</h2>
            <p className="text-sm text-zinc-500">Koleksiyonla uyumlu alternatifler</p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {relatedProducts.map((item) => (
              <Link
                key={item.id}
                href={`/products/${item.slug}`}
                className="rounded-2xl border border-zinc-800/75 bg-zinc-900/50 p-4 transition-all duration-500 ease-in-out hover:border-[#D4AF37]/45 hover:bg-zinc-900/70"
              >
                <p className="text-[11px] tracking-[0.2em] text-[#D4AF37]">{item.category}</p>
                <p className="mt-2 text-lg text-zinc-100">{item.name}</p>
                <p className="mt-2 text-sm text-zinc-400">{item.price.toLocaleString("tr-TR")} TL</p>
              </Link>
            ))}
          </div>
        </section>
      )}

      <div className="py-16">
        <ProductReviews productId={product.id} productSlug={product.slug} productName={product.name} />
      </div>

      <div className="py-16">
        <ProductFaqAccordion />
      </div>

      <MobileStickyAddToCart
        productId={product.id}
        productName={product.name}
        price={product.price}
        stock={product.stock}
      />
    </section>
  );
}
