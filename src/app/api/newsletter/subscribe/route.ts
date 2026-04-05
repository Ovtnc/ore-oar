import { NextResponse } from "next/server";
import { subscribeNewsletter } from "@/lib/db-newsletter";

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as { email?: string } | null;
  const email = String(body?.email ?? "").trim();

  if (!email) {
    return NextResponse.json({ error: "E-posta gerekli." }, { status: 400 });
  }

  try {
    const result = await subscribeNewsletter(email);
    return NextResponse.json({ ok: true, added: result.added, subscribers: result.subscribers });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Kayıt yapılamadı.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

