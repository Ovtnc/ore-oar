import Link from "next/link";
import { notFound } from "next/navigation";
import { PrintButton } from "@/components/print-button";
import { getOrderById } from "@/lib/db-orders";

export default async function OrderLabelPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const order = await getOrderById(id);

  if (!order) {
    notFound();
  }

  return (
    <section className="mx-auto w-full max-w-3xl px-4 py-10 md:px-8 print:p-0">
      <div className="mb-4 flex items-center justify-between print:hidden">
        <Link href="/admin/orders" className="rounded-xl border border-[#D4AF37]/35 px-4 py-2 text-sm text-[#D4AF37] transition hover:bg-[#D4AF37]/10">
          Geri
        </Link>
        <PrintButton />
      </div>

      <div className="rounded-3xl border border-[#D4AF37]/25 bg-white p-8 text-zinc-900 shadow-[0_18px_45px_rgba(0,0,0,0.2)] print:border-0 print:shadow-none">
        <p className="text-xs tracking-[0.24em] text-[#9f7922]">OAR & ORE</p>
        <h1 className="mt-2 text-3xl font-semibold">Kargo Etiketi</h1>
        <p className="mt-1 text-sm text-zinc-500">Sipariş #{order._id}</p>

        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <div className="rounded-2xl border border-zinc-200 p-4">
            <p className="text-xs tracking-[0.2em] text-zinc-500">ALICI</p>
            <p className="mt-2 text-lg font-semibold">{order.shipping.fullName}</p>
            <p className="mt-1 text-sm text-zinc-700">{order.shipping.phone}</p>
            <p className="mt-1 text-sm text-zinc-700">{order.shipping.email}</p>
          </div>
          <div className="rounded-2xl border border-zinc-200 p-4">
            <p className="text-xs tracking-[0.2em] text-zinc-500">TESLİMAT ADRESİ</p>
            <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-zinc-700">
              {order.shipping.address}
              {"\n"}
              {order.shipping.city}
              {order.shipping.postalCode ? `, ${order.shipping.postalCode}` : ""}
              {"\n"}
              {order.shipping.country}
            </p>
          </div>
        </div>

        <div className="mt-6 rounded-2xl border border-zinc-200 p-4">
          <p className="text-xs tracking-[0.2em] text-zinc-500">ÜRÜNLER</p>
          <div className="mt-3 space-y-2">
            {order.items.map((item) => (
              <div key={`${item.productId}-${item.name}`} className="flex items-center justify-between rounded-xl border border-zinc-200 px-3 py-2">
                <div>
                  <p className="font-medium">{item.name}</p>
                  <p className="text-xs text-zinc-500">{item.coatingName ? `Kaplama: ${item.coatingName}` : "Kaplama: Yok"}</p>
                </div>
                <p className="text-sm text-zinc-700">× {item.quantity}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-3">
          <div className="rounded-2xl border border-zinc-200 p-4">
            <p className="text-xs tracking-[0.2em] text-zinc-500">TOPLAM</p>
            <p className="mt-2 text-xl font-semibold">{order.total.toLocaleString("tr-TR")} TL</p>
          </div>
          <div className="rounded-2xl border border-zinc-200 p-4">
            <p className="text-xs tracking-[0.2em] text-zinc-500">SİPARİŞ DURUMU</p>
            <p className="mt-2 text-xl font-semibold">{order.status}</p>
          </div>
          <div className="rounded-2xl border border-zinc-200 p-4">
            <p className="text-xs tracking-[0.2em] text-zinc-500">KARGO TAKİP</p>
            <p className="mt-2 text-xl font-semibold">{order.trackingNumber || "—"}</p>
          </div>
        </div>
      </div>
    </section>
  );
}
