import { NextResponse } from "next/server";
import { requireAdminApiAccess } from "@/lib/admin-auth";
import { getMongoClient } from "@/lib/mongodb";
import { Order } from "@/lib/types";

export async function GET() {
  const guard = await requireAdminApiAccess();
  if (!guard.ok) return guard.response;

  const client = await getMongoClient();
  const db = client.db(process.env.MONGODB_DB ?? "oar-ore");
  const orders = await db.collection<Order>("orders").find({}).sort({ createdAt: -1 }).toArray();

  return NextResponse.json(
    orders.map((order) => ({
      ...order,
      _id: order._id?.toString(),
    })),
  );
}
