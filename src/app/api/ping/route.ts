import { NextResponse } from "next/server";

/**
 * Uygulama ayakta mı kontrolü (database sorgusu yok). Nginx/PM2 ayırımı için kullanın.
 * /api/health -> PostgreSQL sorgusu dahil.
 */
export async function GET() {
  return NextResponse.json({
    ok: true,
    service: "oar-ore",
    checks: { app: true, database: "not checked" },
    now: new Date().toISOString(),
  });
}
