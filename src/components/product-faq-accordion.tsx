"use client";

import { useState } from "react";

type FaqItem = {
  id: string;
  title: string;
  content: string;
};

const faqItems: FaqItem[] = [
  {
    id: "delivery",
    title: "Teslimat Süreci",
    content:
      "Siparişiniz ödeme onayı sonrası atölye üretim sırasına alınır. Hazırlık süresi ürün sayfasında belirtilir, ardından kargoya verildiğinde takip bilgilendirmesi paylaşılır.",
  },
  {
    id: "brass-care",
    title: "Pirinç Bakımı",
    content:
      "Pirinç ürünlerinizi kuru ve yumuşak bir bezle düzenli silin. Parfüm, krem ve kimyasal temasını minimumda tutun. Kullanmadığınızda kuru bir kutuda saklamanız önerilir.",
  },
  {
    id: "returns",
    title: "İade ve Değişim",
    content:
      "Kişiye özel üretilmeyen ürünlerde teslimattan sonra ilgili yasal süre içinde iade/değişim talebi oluşturabilirsiniz. Süreç için İletişim sayfasından sipariş numaranızla başvuru yapabilirsiniz.",
  },
];

function Chevron({ open }: { open: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={`h-4 w-4 transition ${open ? "rotate-180" : ""}`}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      aria-hidden
    >
      <path d="M6 9l6 6 6-6" />
    </svg>
  );
}

export function ProductFaqAccordion() {
  const [openId, setOpenId] = useState<string>(faqItems[0].id);

  return (
    <section className="mx-auto mt-0 w-full max-w-4xl rounded-2xl border border-zinc-800/75 bg-zinc-950/30 p-5 md:p-6">
      <p className="text-xs tracking-[0.22em] text-[#D4AF37]">SSS</p>
      <h2 className="mt-2 text-2xl font-semibold text-zinc-100">Sık Sorulan Sorular</h2>

      <div className="mt-4 space-y-2">
        {faqItems.map((item) => {
          const open = openId === item.id;
          return (
            <article key={item.id} className="overflow-hidden rounded-xl border border-zinc-800/75 bg-black/18">
              <button
                type="button"
                onClick={() => setOpenId((prev) => (prev === item.id ? "" : item.id))}
                className="flex w-full items-center justify-between px-4 py-3 text-left text-sm font-medium text-zinc-100 transition hover:bg-[#D4AF37]/5"
                aria-expanded={open}
                aria-controls={`faq-panel-${item.id}`}
              >
                <span>{item.title}</span>
                <span className="text-[#D4AF37]">
                  <Chevron open={open} />
                </span>
              </button>

              {open && (
                <div id={`faq-panel-${item.id}`} className="border-t border-[#D4AF37]/15 px-4 py-3 text-sm text-zinc-300">
                  {item.content}
                </div>
              )}
            </article>
          );
        })}
      </div>
    </section>
  );
}
