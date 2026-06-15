import { NextResponse } from "next/server";
import { saveUploadedFiles } from "@/lib/upload-storage";

export async function POST(request: Request) {
  const formData = await request.formData();
  const file = formData.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Dosya bulunamadı" }, { status: 400 });
  }

  try {
    const [url] = await saveUploadedFiles([file]);
    return NextResponse.json({ url });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Fotoğraf yüklenemedi.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
