import { NextResponse } from "next/server";
import { requireAdminApiAccess } from "@/lib/admin-auth";
import { deleteProduct, fetchProductBySlug, updateProduct } from "@/lib/db-products";

export async function GET(_request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const guard = await requireAdminApiAccess();
  if (!guard.ok) return guard.response;

  const { slug } = await params;
  const product = await fetchProductBySlug(slug);
  if (!product) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(product);
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const guard = await requireAdminApiAccess();
  if (!guard.ok) return guard.response;

  try {
    const { slug } = await params;
    const body = await request.json();
    const product = await updateProduct(slug, body);
    if (!product) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json(product);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Güncelleme başarısız.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const guard = await requireAdminApiAccess();
  if (!guard.ok) return guard.response;

  try {
    const { slug } = await params;
    const ok = await deleteProduct(slug);
    if (!ok) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Silme başarısız.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
