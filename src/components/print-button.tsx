"use client";

export function PrintButton() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="rounded-xl border border-[#D4AF37] bg-[#D4AF37] px-4 py-2 text-sm font-semibold text-black"
    >
      Yazdır
    </button>
  );
}

