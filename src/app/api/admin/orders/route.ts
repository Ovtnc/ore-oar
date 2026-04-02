import { NextResponse } from "next/server";
import { requireAdminApiAccess } from "@/lib/admin-auth";
import { listAdminOrders } from "@/lib/db-orders";

export async function GET() {
  const guard = await requireAdminApiAccess();
  if (!guard.ok) return guard.response;

  const orders = await listAdminOrders();
  return NextResponse.json(orders);
}
