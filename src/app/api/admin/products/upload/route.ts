import { NextResponse } from "next/server";
import { requireAdminApiAccess } from "@/lib/admin-auth";
import { saveUploadedFiles } from "@/lib/upload-storage";

export async function POST(request: Request) {
  const guard = await requireAdminApiAccess();
  if (!guard.ok) return guard.response;

  const formData = await request.formData();
  const files = formData.getAll("files").filter((entry): entry is File => entry instanceof File);
  const singleFile = formData.get("file");
  if (files.length === 0 && singleFile instanceof File) files.push(singleFile);

  if (files.length === 0) {
    return NextResponse.json({ error: "Dosya bulunamadı" }, { status: 400 });
  }

  try {
    const urls = await saveUploadedFiles(files);
    return NextResponse.json({ url: urls[0], urls });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Görsel yüklenemedi.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
