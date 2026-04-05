import { NextResponse } from "next/server";
import { requireAdminApiAccess } from "@/lib/admin-auth";
import { listAdminOrders } from "@/lib/db-orders";
import { OrderItem } from "@/lib/types";

function csvEscape(value: unknown) {
  const text = String(value ?? "");
  return `"${text.replace(/"/g, '""')}"`;
}

function formatDateForFilter(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date;
}

function formatItems(items: OrderItem[]) {
  return items
    .map((item) => {
      const coating = item.coatingName ? ` (${item.coatingName})` : "";
      return `${item.name}${coating} x${item.quantity}`;
    })
    .join(" | ");
}

export async function GET(request: Request) {
  const guard = await requireAdminApiAccess();
  if (!guard.ok) return guard.response;

  const url = new URL(request.url);
  const from = url.searchParams.get("from");
  const to = url.searchParams.get("to");

  const orders = await listAdminOrders();
  const filtered = orders.filter((order) => {
    const createdAt = formatDateForFilter(order.createdAt);
    if (!createdAt) return false;

    if (from) {
      const fromDate = new Date(`${from}T00:00:00`);
      if (!Number.isNaN(fromDate.getTime()) && createdAt < fromDate) return false;
    }
    if (to) {
      const toDate = new Date(`${to}T23:59:59.999`);
      if (!Number.isNaN(toDate.getTime()) && createdAt > toDate) return false;
    }
    return true;
  });

  const rows = [
    ["Sipariş No", "Tarih", "Müşteri", "E-posta", "Durum", "Ürünler", "Ara Toplam", "Kargo", "İndirim", "Toplam"],
    ...filtered.map((order) => [
      order._id,
      order.createdAt,
      order.shipping.fullName,
      order.shipping.email,
      order.status,
      formatItems(order.items),
      order.subtotal ?? order.total,
      order.shippingFee ?? 0,
      order.couponDiscountAmount ?? 0,
      order.total,
    ]),
  ];

  const csv = rows.map((row) => row.map(csvEscape).join(",")).join("\n");
  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="oar-ore-siparisler.csv"`,
    },
  });
}

