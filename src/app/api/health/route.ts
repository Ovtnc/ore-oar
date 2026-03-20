import { NextResponse } from "next/server";
import { getMongoClient } from "@/lib/mongodb";

export async function GET() {
  try {
    const client = await getMongoClient();
    await client.db(process.env.MONGODB_DB ?? "oar-ore").command({ ping: 1 });

    return NextResponse.json({
      ok: true,
      service: "oar-ore",
      now: new Date().toISOString(),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Health check failed";
    return NextResponse.json(
      {
        ok: false,
        service: "oar-ore",
        error: message,
        now: new Date().toISOString(),
      },
      { status: 503 },
    );
  }
}
