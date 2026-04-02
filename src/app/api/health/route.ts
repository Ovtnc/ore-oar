import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    await prisma.$queryRaw`SELECT 1`;

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
