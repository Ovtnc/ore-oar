import { NextResponse } from "next/server";
import { requireAdminApiAccess } from "@/lib/admin-auth";
import {
  approveReview,
  bulkModerateReviews,
  deleteReview,
  fetchAllReviews,
  rejectReview,
} from "@/lib/db-reviews";

export async function GET() {
  const guard = await requireAdminApiAccess();
  if (!guard.ok) return guard.response;

  const reviews = await fetchAllReviews();
  return NextResponse.json({ reviews });
}

export async function PATCH(request: Request) {
  const guard = await requireAdminApiAccess();
  if (!guard.ok) return guard.response;

  const body = (await request.json().catch(() => null)) as {
    id?: string;
    ids?: string[];
    action?: "approve" | "reject";
  } | null;

  const ids = Array.isArray(body?.ids) && body?.ids.length > 0 ? body.ids : body?.id ? [body.id] : [];
  const action = body?.action ?? "approve";
  if (ids.length === 0) {
    return NextResponse.json({ error: "Geçersiz yorum." }, { status: 400 });
  }

  if (ids.length > 1) {
    const reviews = await bulkModerateReviews(ids, action);
    return NextResponse.json({ ok: true, reviews });
  }

  const id = String(ids[0] ?? "").trim();
  if (action === "reject") {
    const review = await rejectReview(id);
    return NextResponse.json({ ok: true, review });
  }

  const review = await approveReview(id);
  if (!review) {
    return NextResponse.json({ error: "Yorum bulunamadı." }, { status: 404 });
  }

  return NextResponse.json({ ok: true, review });
}

export async function DELETE(request: Request) {
  const guard = await requireAdminApiAccess();
  if (!guard.ok) return guard.response;

  const body = (await request.json().catch(() => null)) as {
    id?: string;
    ids?: string[];
  } | null;

  const ids = Array.isArray(body?.ids) && body.ids.length > 0 ? body.ids : body?.id ? [body.id] : [];
  if (ids.length === 0) {
    return NextResponse.json({ error: "Geçersiz yorum." }, { status: 400 });
  }

  if (ids.length > 1) {
    const reviews = await bulkModerateReviews(ids, "delete");
    return NextResponse.json({ ok: true, reviews });
  }

  await deleteReview(String(ids[0]));
  return NextResponse.json({ ok: true, removed: true });
}
