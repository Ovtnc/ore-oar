import { NextResponse } from "next/server";
import { requireAdminApiAccess } from "@/lib/admin-auth";
import path from "path";
import { promises as fs } from "fs";
import crypto from "crypto";

function resolveExt(file: File) {
  const originalName = file.name || "image";
  const byName = path.extname(originalName).toLowerCase().replace(".", "");
  if (byName) return byName;

  if (file.type === "image/png") return "png";
  if (file.type === "image/jpeg") return "jpg";
  if (file.type === "image/webp") return "webp";
  if (file.type === "image/gif") return "gif";
  return "";
}

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

  const allowedExt = new Set(["png", "jpg", "jpeg", "webp", "gif"]);
  const uploadDir = path.join(process.cwd(), "public", "uploads");
  await fs.mkdir(uploadDir, { recursive: true });

  const urls: string[] = [];
  for (const file of files) {
    const ext = resolveExt(file);
    if (!allowedExt.has(ext)) {
      return NextResponse.json({ error: "Geçersiz dosya tipi" }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const safeName = crypto.randomBytes(16).toString("hex");
    const fileName = `${safeName}.${ext}`;
    const fullPath = path.join(uploadDir, fileName);
    await fs.writeFile(fullPath, buffer);
    urls.push(`/uploads/${fileName}`);
  }

  return NextResponse.json({ url: urls[0], urls });
}
