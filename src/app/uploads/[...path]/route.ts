import { promises as fs } from "fs";
import { getUploadContentType, resolveUploadPathFromSegments } from "@/lib/upload-storage";

export async function GET(_request: Request, { params }: { params: Promise<{ path: string[] }> }) {
  const { path } = await params;
  const filePath = resolveUploadPathFromSegments(path);
  if (!filePath) {
    return new Response("Not found", { status: 404 });
  }

  try {
    const buffer = await fs.readFile(filePath);
    return new Response(new Uint8Array(buffer), {
      headers: {
        "Cache-Control": "public, max-age=0, must-revalidate",
        "Content-Type": getUploadContentType(filePath),
      },
    });
  } catch {
    return new Response("Not found", { status: 404 });
  }
}
