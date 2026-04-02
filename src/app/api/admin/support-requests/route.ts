import { NextResponse } from "next/server";
import { requireAdminApiAccess } from "@/lib/admin-auth";
import { listSupportRequests, updateSupportRequestStatus } from "@/lib/db-support-requests";
import { SupportRequestStatus } from "@/lib/types";

export async function GET() {
  const guard = await requireAdminApiAccess();
  if (!guard.ok) return guard.response;

  const requests = await listSupportRequests();
  return NextResponse.json(requests);
}

export async function PATCH(request: Request) {
  const guard = await requireAdminApiAccess();
  if (!guard.ok) return guard.response;

  const body = (await request.json().catch(() => null)) as {
    id?: string;
    status?: SupportRequestStatus;
  } | null;

  const id = String(body?.id ?? "").trim();
  const status = body?.status;

  const allowedStatuses: SupportRequestStatus[] = ["Yeni", "İnceleniyor", "Çözüldü"];
  if (!id || !status || !allowedStatuses.includes(status)) {
    return NextResponse.json({ error: "Geçersiz talep güncellemesi." }, { status: 400 });
  }

  try {
    await updateSupportRequestStatus(id, status);
  } catch {
    return NextResponse.json({ error: "Talep bulunamadı." }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}
