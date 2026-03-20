import Link from "next/link";

export default function NotFoundPage() {
  return (
    <section className="mx-auto flex min-h-[60vh] w-full max-w-3xl items-center px-4 py-16 md:px-8">
      <div className="lux-card w-full p-8 text-center md:p-10">
        <p className="text-xs tracking-[0.2em] text-[#D4AF37]">404</p>
        <h1 className="mt-3 text-4xl font-semibold text-zinc-100">Sayfa bulunamadı</h1>
        <p className="mt-3 text-zinc-400">
          Aradığınız ürün veya sayfa taşınmış olabilir. Koleksiyona dönerek devam edebilirsiniz.
        </p>
        <Link
          href="/products"
          className="mt-6 inline-flex rounded-lg border border-[#D4AF37] bg-[#D4AF37] px-5 py-3 text-sm font-semibold text-black transition hover:bg-transparent hover:text-[#D4AF37]"
        >
          Koleksiyona Dön
        </Link>
      </div>
    </section>
  );
}
