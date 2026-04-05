import Link from "next/link";
import { NewsletterForm } from "@/components/newsletter-form";

const footerLinks = [
  { href: "/products", label: "Koleksiyon" },
  { href: "/cart", label: "Sepet" },
  { href: "/orders", label: "Siparişlerim" },
  { href: "/contact", label: "İletişim" },
  { href: "/checkout", label: "Teslimat" },
  { href: "/login", label: "Giriş Yap" },
];

export function Footer() {
  return (
    <footer className="mt-16 border-t border-[#D4AF37]/20 bg-black/25">
      <div className="mx-auto grid w-full max-w-6xl gap-8 px-4 py-10 md:grid-cols-[1.2fr_0.8fr] md:px-8">
        <div>
          <p className="text-xs tracking-[0.24em] text-[#D4AF37]">OAR & ORE</p>
          <h2 className="mt-3 max-w-lg text-2xl font-semibold text-zinc-100 md:text-3xl">
            Mimari formda premium pirinç tasarımlar.
          </h2>
          <p className="mt-4 max-w-xl text-sm text-zinc-400">
            Her parça atölyede siparişe özel hazırlanır. Işığı farklı açılarda yansıtan yüzey dili ile
            modern ve uzun ömürlü bir kullanım hedeflenir.
          </p>

          <div className="mt-6 max-w-xl rounded-2xl border border-[#D4AF37]/20 bg-black/20 p-4">
            <p className="text-xs tracking-[0.22em] text-[#D4AF37]">BÜLTEN</p>
            <p className="mt-2 text-sm text-zinc-300">
              Yeni koleksiyonlar, özel üretim duyuruları ve sınırlı parçalar için e-bültene katıl.
            </p>
            <div className="mt-4">
              <NewsletterForm />
            </div>
          </div>
        </div>

        <div className="grid gap-3 self-end text-sm">
          {footerLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="w-fit text-zinc-300 transition hover:text-[#D4AF37]"
            >
              {link.label}
            </Link>
          ))}
        </div>
      </div>
      <div className="border-t border-[#D4AF37]/15">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-2 px-4 py-4 text-xs text-zinc-500 md:flex-row md:items-center md:justify-between md:px-8">
          <p>© {new Date().getFullYear()} Oar & Ore. Tüm hakları saklıdır.</p>
          <p>İstanbul&apos;da tasarlandı, siparişe özel üretildi.</p>
        </div>
      </div>
    </footer>
  );
}
