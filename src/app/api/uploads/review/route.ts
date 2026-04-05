import { NextResponse } from "next/server";
import path from "path";
import crypto from "crypto";
import { promises as fs } from "fs";

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
  const formData = await request.formData();
  const file = formData.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Dosya bulunamadı" }, { status: 400 });
  }

  const allowedExt = new Set(["png", "jpg", "jpeg", "webp", "gif"]);
  const ext = resolveExt(file);
  if (!allowedExt.has(ext)) {
    return NextResponse.json({ error: "Geçersiz dosya tipi" }, { status: 400 });
  }

  const uploadDir = path.join(process.cwd(), "public", "uploads");
  await fs.mkdir(uploadDir, { recursive: true });
  const buffer = Buffer.from(await file.arrayBuffer());
  const fileName = `${crypto.randomBytes(16).toString("hex")}.${ext}`;
  await fs.writeFile(path.join(uploadDir, fileName), buffer);

  return NextResponse.json({ url: `/uploads/${fileName}` });
}

