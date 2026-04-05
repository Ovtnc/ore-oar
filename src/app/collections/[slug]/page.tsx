import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ProductCard } from "@/components/product-card";
import { fetchProducts } from "@/lib/db-products";

function normalizeSlug(input: string) {
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

function normalizeCollectionName(input: string) {
  const slug = normalizeSlug(input);
  const lookup = new Map<string, string>([
    ["atelier-01", "Atelier 01"],
    ["monolith", "Monolith"],
    ["arc-form", "Arc Form"],
    ["forge", "Forge"],
    ["atelier-rozet", "Atelier Rozet"],
  ]);
  return lookup.get(slug) ?? input;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const collectionName = normalizeCollectionName(slug.replace(/-/g, " "));
  const products = await fetchProducts();
  const collectionProducts = products.filter((product) => normalizeSlug(product.collection) === normalizeSlug(collectionName));
  const description =
    collectionProducts[0]?.description ??
    `${collectionName} koleksiyonu için özel üretim pirinç takılar, zarif yüzeyler ve sınırlı parçalar.`;

  return {
    title: `${collectionName} Koleksiyonu | Oar & Ore`,
    description,
    keywords: collectionProducts.flatMap((product) => product.seoKeywords ?? []),
  };
}

export default async function CollectionPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const products = await fetchProducts();
  const collectionName = normalizeCollectionName(slug.replace(/-/g, " "));
  const collectionProducts = products.filter((product) => normalizeSlug(product.collection) === normalizeSlug(collectionName));

  if (collectionProducts.length === 0) {
    notFound();
  }

  return (
    <section className="mx-auto w-full max-w-6xl px-4 py-10 md:px-8">
      <div className="rounded-3xl border border-[#D4AF37]/25 bg-[linear-gradient(135deg,rgba(212,175,55,0.18),rgba(18,18,18,0.9)_42%,rgba(8,8,8,0.95))] p-6">
        <p className="text-xs tracking-[0.24em] text-[#D4AF37]">COLLECTION</p>
        <h1 className="mt-2 text-4xl font-semibold uppercase tracking-[0.18em] text-zinc-100">{collectionName}</h1>
        <p className="mt-3 max-w-2xl text-zinc-300">
          {collectionName} koleksiyonunda yer alan özel üretim parçalar. Hepsi atölyede siparişe özel hazırlanır.
        </p>
        <div className="mt-5 flex flex-wrap gap-2">
          <Link href="/products" className="rounded-full border border-[#D4AF37]/35 bg-black/25 px-3 py-1 text-xs text-[#D4AF37]">
            Tüm Koleksiyon
          </Link>
          <span className="rounded-full border border-[#D4AF37]/20 bg-black/25 px-3 py-1 text-xs text-zinc-300">
            {collectionProducts.length} parça
          </span>
        </div>
      </div>

      <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {collectionProducts.map((product) => (
          <ProductCard key={product.id} product={product} size="lg" enableQuickView />
        ))}
      </div>
    </section>
  );
}

