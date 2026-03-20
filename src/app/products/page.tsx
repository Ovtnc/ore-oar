import { fetchProducts } from "@/lib/db-products";
import { ProductsCatalog } from "@/components/products-catalog";

const collectionSummary = [
  { name: "Atelier 01", note: "Akıcı geometriler ve günlük lüks" },
  { name: "Monolith", note: "Keskin hatlar, güçlü duruş" },
  { name: "Arc Form", note: "Dengeli kıvrımlar, hafif yapı" },
  { name: "Forge", note: "Endüstriyel detaylar ve dayanıklılık" },
];

export const dynamic = "force-dynamic";

export default async function ProductsPage() {
  const products = await fetchProducts();
  const newCount = products.filter((product) => product.isNew).length;
  const limitedCount = products.filter((product) => product.isLimited).length;
  const coatingCount = products.filter((product) => (product.coatingOptions?.length ?? 0) > 0).length;

  return (
    <section className="mx-auto w-full max-w-6xl px-4 py-10 md:px-8">
      <div className="rounded-3xl border border-[#D4AF37]/25 bg-[linear-gradient(135deg,rgba(212,175,55,0.2),rgba(24,24,24,0.92)_32%,rgba(8,8,8,0.96))] p-6 shadow-[0_20px_50px_rgba(0,0,0,0.34)]">
        <p className="text-xs tracking-[0.24em] text-[#F3D47B]">CURATED COLLECTION</p>
        <h1 className="mt-3 text-4xl font-semibold text-zinc-100">Koleksiyon</h1>
        <p className="mt-2 max-w-2xl text-zinc-300">
          Özel üretim pirinç parçalar: modern geometri, elde sonlandırılan lüks bitiş ve güçlü silüet.
        </p>

        <div className="mt-6 grid gap-4 md:grid-cols-4">
          <div className="rounded-2xl border border-[#D4AF37]/20 bg-black/40 p-4">
            <p className="text-xs tracking-[0.2em] text-[#D4AF37]">TOPLAM TASARIM</p>
            <p className="mt-2 text-3xl font-semibold">{products.length}</p>
          </div>
          <div className="rounded-2xl border border-[#D4AF37]/20 bg-black/40 p-4">
            <p className="text-xs tracking-[0.2em] text-[#D4AF37]">YENİ SEZON</p>
            <p className="mt-2 text-3xl font-semibold">{newCount}</p>
          </div>
          <div className="rounded-2xl border border-[#D4AF37]/20 bg-black/40 p-4">
            <p className="text-xs tracking-[0.2em] text-[#D4AF37]">LİMİTED</p>
            <p className="mt-2 text-3xl font-semibold">{limitedCount}</p>
          </div>
          <div className="rounded-2xl border border-[#D4AF37]/20 bg-black/40 p-4">
            <p className="text-xs tracking-[0.2em] text-[#D4AF37]">KAPLAMA OPSİYONLU</p>
            <p className="mt-2 text-3xl font-semibold">{coatingCount}</p>
          </div>
        </div>
      </div>

      <ProductsCatalog products={products} />

      <div className="mt-12 grid gap-3 rounded-2xl border border-[#D4AF37]/20 bg-zinc-900/40 p-5 md:grid-cols-2">
        {collectionSummary.map((collection) => (
          <div key={collection.name} className="rounded-xl border border-[#D4AF37]/15 bg-black/30 p-4">
            <p className="text-sm font-semibold text-[#D4AF37]">{collection.name}</p>
            <p className="mt-1 text-sm text-zinc-300">{collection.note}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
