import crypto from "crypto";
import path from "path";
import { promises as fs } from "fs";

const ALLOWED_UPLOAD_EXTENSIONS = new Set(["png", "jpg", "jpeg", "webp", "gif"]);

type UploadFileLike = {
  name: string;
  type: string;
  arrayBuffer(): Promise<ArrayBuffer>;
};

export function getUploadDir() {
  return process.env.UPLOAD_DIR || path.join(process.cwd(), "public", "uploads");
}

export function resolveUploadExt(file: Pick<UploadFileLike, "name" | "type">) {
  const originalName = file.name || "image";
  const byName = path.extname(originalName).toLowerCase().replace(".", "");
  if (byName) return byName;

  if (file.type === "image/png") return "png";
  if (file.type === "image/jpeg") return "jpg";
  if (file.type === "image/webp") return "webp";
  if (file.type === "image/gif") return "gif";
  return "";
}

export function assertAllowedUploadExt(ext: string) {
  if (!ALLOWED_UPLOAD_EXTENSIONS.has(ext)) {
    throw new Error("Geçersiz dosya tipi");
  }
}

export function getUploadContentType(fileName: string) {
  const ext = path.extname(fileName).toLowerCase();
  if (ext === ".png") return "image/png";
  if (ext === ".jpg" || ext === ".jpeg") return "image/jpeg";
  if (ext === ".webp") return "image/webp";
  if (ext === ".gif") return "image/gif";
  return "application/octet-stream";
}

export function resolveUploadPathFromSegments(segments: string[]) {
  if (segments.length !== 1) return null;

  const fileName = segments[0]?.trim();
  if (!fileName || fileName.includes("/") || fileName.includes("\\") || fileName.includes("..")) {
    return null;
  }

  const uploadDir = path.resolve(getUploadDir());
  const fullPath = path.resolve(uploadDir, fileName);
  if (path.dirname(fullPath) !== uploadDir) return null;
  return fullPath;
}

export async function saveUploadedFiles(files: UploadFileLike[]) {
  const uploadDir = getUploadDir();
  await fs.mkdir(uploadDir, { recursive: true });

  const urls: string[] = [];
  for (const file of files) {
    const ext = resolveUploadExt(file);
    assertAllowedUploadExt(ext);

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const safeName = crypto.randomBytes(16).toString("hex");
    const fileName = `${safeName}.${ext}`;
    await fs.writeFile(path.join(uploadDir, fileName), buffer);
    urls.push(`/uploads/${fileName}`);
  }

  return urls;
}
