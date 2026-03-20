import { ObjectId } from "mongodb";
import { NextResponse } from "next/server";
import { requireAdminApiAccess } from "@/lib/admin-auth";
import { getMongoClient } from "@/lib/mongodb";
import { SupportRequest, SupportRequestStatus } from "@/lib/types";

type DbSupportRequest = Omit<SupportRequest, "_id"> & { _id: ObjectId };

export async function GET() {
  const guard = await requireAdminApiAccess();
  if (!guard.ok) return guard.response;

  const client = await getMongoClient();
  const db = client.db(process.env.MONGODB_DB ?? "oar-ore");
  const requests = await db
    .collection<DbSupportRequest>("support_requests")
    .find({})
    .sort({ createdAt: -1 })
    .limit(60)
    .toArray();

  return NextResponse.json(
    requests.map((request) => ({
      ...request,
      _id: request._id.toString(),
    })),
  );
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
  if (!ObjectId.isValid(id) || !status || !allowedStatuses.includes(status)) {
    return NextResponse.json({ error: "Geçersiz talep güncellemesi." }, { status: 400 });
  }

  const client = await getMongoClient();
  const db = client.db(process.env.MONGODB_DB ?? "oar-ore");
  const result = await db.collection<DbSupportRequest>("support_requests").updateOne(
    { _id: new ObjectId(id) },
    {
      $set: {
        status,
        updatedAt: new Date().toISOString(),
      },
    },
  );

  if (result.matchedCount !== 1) {
    return NextResponse.json({ error: "Talep bulunamadı." }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}
