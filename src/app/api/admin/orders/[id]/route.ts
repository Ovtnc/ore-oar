import { NextResponse } from "next/server";
import { requireAdminApiAccess } from "@/lib/admin-auth";
import { ObjectId } from "mongodb";
import { sendOrderStatusUpdateToCustomer } from "@/lib/email";
import { getMongoClient } from "@/lib/mongodb";
import { Order, OrderStatus } from "@/lib/types";

type DbOrder = Omit<Order, "_id"> & { _id: ObjectId };

const allowedStatuses: OrderStatus[] = [
  "Beklemede",
  "Ödeme Alındı",
  "Sipariş Hazırlanıyor",
  "Kargoya Verildi",
  "Tamamlandı",
];

function toPositiveInt(value: unknown) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return 0;
  return Math.max(0, Math.trunc(parsed));
}

function aggregateStockReturnDemand(order: DbOrder) {
  const map = new Map<string, number>();
  for (const item of order.items ?? []) {
    const productId = String(item.productId ?? "").trim();
    if (!productId) continue;
    const quantity = toPositiveInt(item.quantity);
    if (quantity <= 0) continue;
    map.set(productId, (map.get(productId) ?? 0) + quantity);
  }
  return map;
}

async function updateOrderStatus(id: string, status: string) {
  if (!allowedStatuses.includes(status as OrderStatus)) {
    return NextResponse.json({ error: "Invalid status" }, { status: 400 });
  }
  if (!ObjectId.isValid(id)) {
    return NextResponse.json({ error: "Geçersiz sipariş." }, { status: 400 });
  }

  const client = await getMongoClient();
  const db = client.db(process.env.MONGODB_DB ?? "oar-ore");
  const ordersCollection = db.collection<DbOrder>("orders");
  const objectId = new ObjectId(id);
  const order = await ordersCollection.findOne({ _id: objectId });
  if (!order) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const previousStatus = order.status;
  const nextStatus = status as OrderStatus;

  await ordersCollection.updateOne(
    { _id: objectId },
    { $set: { status: nextStatus, updatedAt: new Date().toISOString() } },
  );

  if (previousStatus !== nextStatus) {
    try {
      const orderForEmail: Order = { ...order, _id: undefined };
      await sendOrderStatusUpdateToCustomer(orderForEmail, id, nextStatus);
    } catch {
      // E-posta hatası durum güncellemesini bozmasın.
    }
  }

  return NextResponse.json({ ok: true });
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const guard = await requireAdminApiAccess();
  if (!guard.ok) return guard.response;

  const { id } = await params;
  const body = (await request.json()) as { status?: string };
  return updateOrderStatus(id, body.status ?? "");
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const guard = await requireAdminApiAccess();
  if (!guard.ok) return guard.response;

  const { id } = await params;
  const formData = await request.formData();
  const method = String(formData.get("_method") ?? "");
  const status = String(formData.get("status") ?? "");

  if (method.toUpperCase() === "PATCH") {
    return updateOrderStatus(id, status);
  }

  return NextResponse.json({ error: "Method not allowed" }, { status: 405 });
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const guard = await requireAdminApiAccess();
  if (!guard.ok) return guard.response;

  const { id } = await params;
  const client = await getMongoClient();
  const db = client.db(process.env.MONGODB_DB ?? "oar-ore");
  const order = await db.collection("orders").findOne({ _id: new ObjectId(id) });
  if (!order) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({
    ...order,
    _id: (order as { _id?: { toString: () => string } })._id?.toString() ?? id,
  });
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const guard = await requireAdminApiAccess();
  if (!guard.ok) return guard.response;

  const { id } = await params;
  if (!ObjectId.isValid(id)) {
    return NextResponse.json({ error: "Geçersiz sipariş." }, { status: 400 });
  }

  const client = await getMongoClient();
  const db = client.db(process.env.MONGODB_DB ?? "oar-ore");
  const ordersCollection = db.collection<DbOrder>("orders");
  const objectId = new ObjectId(id);
  const order = await ordersCollection.findOne({ _id: objectId });
  if (!order) {
    return NextResponse.json({ error: "Sipariş bulunamadı." }, { status: 404 });
  }

  const stockReturns = aggregateStockReturnDemand(order);
  const restoredRows: Array<{ productId: string; quantity: number }> = [];

  for (const [productId, quantity] of stockReturns.entries()) {
    const result = await db.collection("products").updateOne(
      { $or: [{ id: productId }, { slug: productId }] },
      { $inc: { stock: quantity } },
    );

    if (result.modifiedCount !== 1) {
      // Kısmi artış olduysa geri al.
      for (const reverted of restoredRows) {
        await db.collection("products").updateOne(
          { $or: [{ id: reverted.productId }, { slug: reverted.productId }] },
          { $inc: { stock: -reverted.quantity } },
        );
      }
      return NextResponse.json(
        { error: "Stok iadesi tamamlanamadı. Ürün eşleşmesi kontrol edilmeli." },
        { status: 409 },
      );
    }

    restoredRows.push({ productId, quantity });
  }

  const result = await ordersCollection.deleteOne({ _id: objectId });

  if (result.deletedCount !== 1) {
    // Sipariş silinmediyse daha önce eklenen stokları geri al.
    for (const reverted of restoredRows) {
      await db.collection("products").updateOne(
        { $or: [{ id: reverted.productId }, { slug: reverted.productId }] },
        { $inc: { stock: -reverted.quantity } },
      );
    }
    return NextResponse.json({ error: "Sipariş bulunamadı." }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}
