import { NextResponse } from "next/server";
import { requireAdminApiAccess } from "@/lib/admin-auth";
import { fetchNewsletterSubscribers } from "@/lib/db-newsletter";

export async function GET() {
  const guard = await requireAdminApiAccess();
  if (!guard.ok) return guard.response;

  const subscribers = await fetchNewsletterSubscribers();
  return NextResponse.json({ subscribers });
}

