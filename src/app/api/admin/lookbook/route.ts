import { NextResponse } from "next/server";
import { requireAdminApiAccess } from "@/lib/admin-auth";
import { fetchLookbookSlugs, saveLookbookSlugs } from "@/lib/db-lookbook";

export async function GET() {
  const guard = await requireAdminApiAccess();
  if (!guard.ok) return guard.response;

  try {
    const slugs = await fetchLookbookSlugs();
    return NextResponse.json({ slugs });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Lookbook verisi alınamadı.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  const guard = await requireAdminApiAccess();
  if (!guard.ok) return guard.response;

  try {
    const body = (await request.json()) as { slugs?: unknown };
    const slugs = await saveLookbookSlugs(body.slugs);
    return NextResponse.json({ slugs });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Lookbook kaydedilemedi.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
