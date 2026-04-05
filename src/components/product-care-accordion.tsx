"use client";

import { useState } from "react";

type ProductCareAccordionProps = {
  leadTimeDays: number;
};

type CareItem = {
  id: string;
  title: string;
  content: string;
};

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

export function ProductCareAccordion({ leadTimeDays }: ProductCareAccordionProps) {
  const items: CareItem[] = [
    {
      id: "material",
      title: "Materyal & İşçilik",
      content:
        "%100 masif pirinç gövde kullanılır. Her parça atölyede elde form verilip polisajlanır ve kalite kontrol aşamasından geçirilir.",
    },
    {
      id: "care",
      title: "Bakım Rehberi",
      content:
        "Pirinç doğal yapısı gereği zamanla karakter kazanabilir. Yumuşak kuru bir bezle düzenli silinmesi, parfüm ve kimyasal temasının azaltılması önerilir.",
    },
    {
      id: "delivery",
      title: "Teslimat & İade",
      content: `Siparişler ortalama ${leadTimeDays} gün içinde hazırlanır (genellikle 3-5 gün). Ürünler özel mühürlü kutuda gönderilir; süreç detayları için teslimat/iade politikasını takip edebilirsiniz.`,
    },
  ];

  const [openId, setOpenId] = useState<string>(items[0].id);

  return (
    <div className="mt-5 rounded-2xl border border-zinc-800/75 bg-zinc-950/30 p-3">
      <p className="text-[11px] tracking-[0.22em] text-[#D4AF37]">CARE & QUALITY</p>
      <div className="mt-2 space-y-2">
        {items.map((item) => {
          const open = openId === item.id;
          return (
            <article key={item.id} className="overflow-hidden rounded-xl border border-zinc-800/75 bg-black/18">
              <button
                type="button"
                onClick={() => setOpenId((prev) => (prev === item.id ? "" : item.id))}
                className="flex w-full items-center justify-between px-3 py-2.5 text-left text-sm text-zinc-100 transition hover:bg-[#D4AF37]/5"
                aria-expanded={open}
                aria-controls={`care-panel-${item.id}`}
              >
                <span>{item.title}</span>
                <span className="text-[#D4AF37]">
                  <Chevron open={open} />
                </span>
              </button>
              {open && (
                <div
                  id={`care-panel-${item.id}`}
                  className="border-t border-[#D4AF37]/12 px-3 py-2.5 text-sm leading-relaxed text-zinc-300"
                >
                  {item.content}
                </div>
              )}
            </article>
          );
        })}
      </div>
    </div>
  );
}
