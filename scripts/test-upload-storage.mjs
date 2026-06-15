import assert from "node:assert/strict";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";

import {
  getUploadContentType,
  resolveUploadPathFromSegments,
  saveUploadedFiles,
} from "../src/lib/upload-storage.ts";

test("saveUploadedFiles stores image files in the configured upload directory", async () => {
  const uploadDir = await mkdtemp(path.join(tmpdir(), "oar-ore-uploads-"));
  const previousUploadDir = process.env.UPLOAD_DIR;
  process.env.UPLOAD_DIR = uploadDir;

  try {
    const bytes = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]);
    const file = new File([bytes], "sample.png", { type: "image/png" });

    const urls = await saveUploadedFiles([file]);

    assert.equal(urls.length, 1);
    assert.match(urls[0], /^\/uploads\/[a-f0-9]{32}\.png$/);

    const storedPath = resolveUploadPathFromSegments([path.basename(urls[0])]);
    assert.equal(storedPath, path.join(uploadDir, path.basename(urls[0])));
    assert.deepEqual(await readFile(storedPath), Buffer.from(bytes));
  } finally {
    if (previousUploadDir === undefined) {
      delete process.env.UPLOAD_DIR;
    } else {
      process.env.UPLOAD_DIR = previousUploadDir;
    }
    await rm(uploadDir, { recursive: true, force: true });
  }
});

test("resolveUploadPathFromSegments rejects traversal attempts", async () => {
  const uploadDir = await mkdtemp(path.join(tmpdir(), "oar-ore-uploads-"));
  const previousUploadDir = process.env.UPLOAD_DIR;
  process.env.UPLOAD_DIR = uploadDir;

  try {
    assert.equal(resolveUploadPathFromSegments(["..", "secret.png"]), null);
    assert.equal(resolveUploadPathFromSegments(["nested", "image.png"]), null);
    assert.equal(resolveUploadPathFromSegments(["image.png"]), path.join(uploadDir, "image.png"));
  } finally {
    if (previousUploadDir === undefined) {
      delete process.env.UPLOAD_DIR;
    } else {
      process.env.UPLOAD_DIR = previousUploadDir;
    }
    await rm(uploadDir, { recursive: true, force: true });
  }
});

test("getUploadContentType returns stable image mime types", () => {
  assert.equal(getUploadContentType("photo.jpg"), "image/jpeg");
  assert.equal(getUploadContentType("photo.webp"), "image/webp");
  assert.equal(getUploadContentType("photo.gif"), "image/gif");
  assert.equal(getUploadContentType("photo.bin"), "application/octet-stream");
});
