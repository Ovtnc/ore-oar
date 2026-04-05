import Image from "next/image";
import Link from "next/link";
import { HeroPendant } from "@/components/hero-pendant";
import { fetchLookbookSlugs } from "@/lib/db-lookbook";
import { fetchProducts } from "@/lib/db-products";
import { ProductCard } from "@/components/product-card";

const promises = [
  "Siparişe özel üretim", "+9 koleksiyon parçası", "2-5 gün hazırlık",
];

const processSteps = [
  {
    title: "01. Form",
    description: "Geometrik silüetler önce dijital çizimle test edilir.",
  },
  {
    title: "02. İşleme",
    description: "Masif pirinç gövde yüzeyi katmanlı olarak işlenir.",
  },
  {
    title: "03. Polisaj",
    description: "El polisajı ile ışık geçişleri dengelenir.",
  },
];

const trustNotes = [
  "Parça bazlı kalite kontrol",
  "Kaplama opsiyonu olan ürünlerde şeffaf +fiyatlandırma",
  "Sipariş sonrası atölye durum bilgilendirmesi",
];

export const dynamic = "force-dynamic";

export default async function Home() {
  const [products, lookbookSlugs] = await Promise.all([
    fetchProducts(),
    fetchLookbookSlugs(),
  ]);
  const featured = products.slice(0, 6);
  const configuredLookbook = lookbookSlugs
    .map((slug) => products.find((product) => product.slug === slug))
    .filter((product): product is (typeof products)[number] => Boolean(product));
  const lookbook = (configuredLookbook.length > 0 ? configuredLookbook : products.slice(0, 3)).slice(0, 8);
  const withCoating = products.filter((product) => (product.coatingOptions?.length ?? 0) > 0).length;
  const newCount = products.filter((product) => product.isNew).length;
  const totalStock = products.reduce((sum, product) => sum + Math.max(0, product.stock), 0);
  const activeCategories = Array.from(new Set(products.map((product) => product.category))).slice(0, 5);

  const atelierSignals = [
    { label: "Aktif Tasarım", value: String(products.length), hint: "Yayındaki toplam ürün" },
    { label: "Kaplama Opsiyonlu", value: String(withCoating), hint: "Opsiyonel yüzey seçimi" },
    { label: "Yeni Eklenen", value: String(newCount), hint: "Son koleksiyon parçaları" },
    { label: "Toplam Stok", value: String(totalStock), hint: "Hızlı gönderime uygun adet" },
  ];

  return (
    <div>
      <HeroPendant />

      <section className="mx-auto w-full max-w-6xl px-4 py-14 md:px-8">
        <div className="rounded-3xl border border-[#D4AF37]/20 bg-[linear-gradient(145deg,rgba(36,36,36,0.52),rgba(12,12,12,0.34))] p-5 md:p-6">
          <div className="mb-6 flex flex-wrap gap-2">
            {promises.map((item) => (
              <span key={item} className="lux-pill px-4 py-2 text-xs tracking-[0.16em] text-zinc-200">
                {item}
              </span>
            ))}
          </div>

          <div className="mb-8 flex items-end justify-between gap-4">
            <div>
              <h2 className="text-3xl font-semibold text-zinc-100 md:text-4xl">Seçilmiş Tasarımlar</h2>
              <p className="mt-2 max-w-lg text-sm text-zinc-300">
                Güncel koleksiyondan öne çıkan parçalar. Her ürün elde son dokunuştan geçer.
              </p>
            </div>
            <Link href="/products" className="text-sm text-[#D4AF37] transition hover:text-[#f3d47b]">
              Tüm ürünleri gör →
            </Link>
          </div>

          {featured.length === 0 ? (
            <div className="lux-card p-8 text-center text-zinc-300">
              Henüz ürün eklenmemiş. Kısa süre içinde yeni koleksiyonlar burada olacak.
            </div>
          ) : (
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {featured.map((product) => (
                <ProductCard key={product.id} product={product} size="lg" />
              ))}
            </div>
          )}
        </div>
      </section>

      <section className="mx-auto w-full max-w-6xl px-4 py-2 md:px-8">
        <div className="lux-card overflow-hidden p-6 md:p-8">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-xs tracking-[0.24em] text-[#D4AF37]">ATELIER PULSE</p>
              <h2 className="mt-2 text-3xl text-zinc-100 md:text-4xl">Canlı atölye metrikleri</h2>
              <p className="mt-2 max-w-xl text-sm text-zinc-400">
                Koleksiyonun güncel durumu tek bakışta: stok, yeni ürünler ve kişiselleştirme kapasitesi.
              </p>
            </div>
            <Link href="/products" className="text-sm text-[#D4AF37] transition hover:text-[#f3d47b]">
              Ürün kataloğunu aç →
            </Link>
          </div>

          <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {atelierSignals.map((item) => (
              <article
                key={item.label}
                className="rounded-2xl border border-[#D4AF37]/20 bg-[linear-gradient(145deg,rgba(20,20,20,0.9),rgba(8,8,8,0.95))] p-4"
              >
                <p className="text-xs tracking-[0.18em] text-zinc-400">{item.label}</p>
                <p className="mt-2 text-3xl font-semibold text-[#F3D47B]">{item.value}</p>
                <p className="mt-2 text-xs text-zinc-500">{item.hint}</p>
              </article>
            ))}
          </div>

          {activeCategories.length > 0 && (
            <div className="mt-5 flex flex-wrap gap-2">
              {activeCategories.map((category) => (
                <span key={category} className="rounded-full border border-[#D4AF37]/28 bg-black/35 px-3 py-1 text-xs text-zinc-300">
                  {category}
                </span>
              ))}
            </div>
          )}
        </div>
      </section>

      {lookbook.length > 0 && (
        <section className="mx-auto w-full max-w-6xl px-4 py-12 md:px-8">
          <div className="rounded-3xl border border-[#D4AF37]/20 bg-[linear-gradient(145deg,rgba(34,34,34,0.5),rgba(10,10,10,0.3))] p-5 md:p-6">
            <div className="mb-6">
              <p className="text-xs tracking-[0.24em] text-[#D4AF37]">LOOKBOOK</p>
              <h2 className="mt-2 text-3xl text-zinc-100 md:text-4xl">Işıkta yaşayan yüzeyler</h2>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              {lookbook.map((product) => (
                <Link
                  key={product.id}
                  href={`/products/${product.slug}`}
                  className="group relative min-h-[280px] overflow-hidden rounded-2xl border border-[#D4AF37]/20 bg-black/25"
                >
                  <Image
                    src={product.image || "/logo.png"}
                    alt={product.name}
                    fill
                    sizes="(max-width: 768px) 100vw, 33vw"
                    className="object-cover transition duration-500 group-hover:scale-105"
                    loading="lazy"
                    fetchPriority="low"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/68 via-black/10 to-transparent" />
                  <div className="absolute bottom-0 left-0 right-0 p-4">
                    <p className="text-[11px] tracking-[0.18em] text-[#D4AF37]">{product.category}</p>
                    <h3 className="mt-1 text-xl text-zinc-100">{product.name}</h3>
                    <p className="mt-1 text-sm text-zinc-300">{product.price.toLocaleString("tr-TR")} TL</p>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      <section id="nasil-calisiyoruz" className="mx-auto grid w-full max-w-6xl gap-6 px-4 py-6 md:grid-cols-3 md:px-8">
        {processSteps.map((step) => (
          <article key={step.title} className="lux-card p-5 transition hover:border-[#D4AF37]/45 hover:bg-black/25">
            <p className="text-xs tracking-[0.24em] text-[#D4AF37]">{step.title}</p>
            <h3 className="mt-3 text-2xl text-zinc-100">{step.description}</h3>
          </article>
        ))}
      </section>

      <section className="mx-auto w-full max-w-6xl px-4 py-16 md:px-8">
        <div className="lux-card grid gap-4 p-8 md:grid-cols-[1fr_auto] md:items-center">
          <div>
            <p className="text-xs tracking-[0.22em] text-[#D4AF37]">KİŞİSEL DOKUNUŞ</p>
            <h2 className="mt-3 text-3xl text-zinc-100 md:text-4xl">Koleksiyonunu şimdi oluştur.</h2>
            <p className="mt-2 text-sm text-zinc-400">
              Sipariş sonrası üretim planı aynı gün içinde başlatılır, her adım manuel kontrol edilir.
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              {trustNotes.map((note) => (
                <span key={note} className="rounded-full border border-[#D4AF37]/25 bg-black/35 px-3 py-1 text-xs text-zinc-300">
                  {note}
                </span>
              ))}
            </div>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row md:flex-col md:items-end">
            <Link
              href="/products"
              className="inline-flex w-full items-center justify-center rounded-lg border border-[#D4AF37] bg-[#D4AF37] px-6 py-3 text-sm font-semibold text-black transition hover:bg-transparent hover:text-[#D4AF37] sm:w-auto"
            >
              Koleksiyona Git
            </Link>
            <Link
              href="/orders"
              className="inline-flex w-full items-center justify-center rounded-lg border border-[#D4AF37]/35 bg-black/25 px-6 py-3 text-sm font-semibold text-[#F3D47B] transition hover:border-[#D4AF37] hover:bg-[#D4AF37]/10 sm:w-auto"
            >
              Siparişlerimi Gör
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
