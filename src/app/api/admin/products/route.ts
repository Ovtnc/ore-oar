import { NextResponse } from "next/server";
import { requireAdminApiAccess } from "@/lib/admin-auth";
import { createProduct, fetchProducts } from "@/lib/db-products";

export async function GET() {
  const guard = await requireAdminApiAccess();
  if (!guard.ok) return guard.response;

  const products = await fetchProducts();
  return NextResponse.json(products);
}

export async function POST(request: Request) {
  const guard = await requireAdminApiAccess();
  if (!guard.ok) return guard.response;

  try {
    const body = await request.json();
    const product = await createProduct(body);
    return NextResponse.json(product);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Güncelleme başarısız.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
