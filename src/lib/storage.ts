import { createHash, randomUUID } from "node:crypto";
import { mkdir, readFile, writeFile, unlink } from "node:fs/promises";
import path from "node:path";

// Local filesystem storage for portfolio uploads (replaces Supabase Storage).
// Files live in UPLOAD_DIR (mounted as a persistent Docker volume) and are
// served by the app itself under /uploads/<stored-name>.
//
// Security model:
// - Only image/* content types are accepted (same rule as the old CMS UI).
// - Stored names are generated server-side (uuid + sanitized extension);
//   user-supplied names never touch the filesystem.
// - Public URLs are always /uploads/<uuid>.<ext> — no path traversal possible.

const UPLOAD_DIR = process.env["UPLOAD_DIR"] ?? "/var/lib/alpha-insights-portfolio/uploads";
const MAX_UPLOAD_BYTES = 10 * 1024 * 1024; // 10 MB, matches the CMS UI limit

const SAFE_EXTENSIONS: Record<string, string> = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
  "image/gif": ".gif",
  "image/avif": ".avif",
  "image/svg+xml": ".svg",
};

function resolveUploadDir(): string {
  return path.resolve(UPLOAD_DIR);
}

function isStoredNameSafe(name: string): boolean {
  // Stored names are always "<uuid>.<ext>" — refuse anything else.
  return /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}\.(jpg|jpeg|png|webp|gif|avif|svg)$/.test(
    name,
  );
}

function contentTypeFor(name: string): string {
  switch (path.extname(name)) {
    case ".png":
      return "image/png";
    case ".webp":
      return "image/webp";
    case ".gif":
      return "image/gif";
    case ".avif":
      return "image/avif";
    case ".svg":
      return "image/svg+xml";
    default:
      return "image/jpeg";
  }
}

export async function ensureUploadDir(): Promise<string> {
  const dir = resolveUploadDir();
  await mkdir(dir, { recursive: true, mode: 0o755 });
  return dir;
}

export type StoredUpload = { storedName: string; url: string; bytes: number; contentType: string };

export async function storeUpload(file: File): Promise<StoredUpload> {
  const contentType = file.type;
  const ext = SAFE_EXTENSIONS[contentType];
  if (!ext) {
    throw new Error("Unsupported image type. Use JPG, PNG, WebP, GIF, AVIF or SVG.");
  }
  const size = file.size;
  if (size <= 0 || size > MAX_UPLOAD_BYTES) {
    throw new Error("Image must be between 1 byte and 10 MB.");
  }

  const dir = await ensureUploadDir();
  const storedName = `${randomUUID()}${ext}`;
  const target = path.join(dir, storedName);

  // Double-check containment (path.join with a validated name is already safe).
  if (!target.startsWith(dir + path.sep)) {
    throw new Error("Invalid storage path");
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  await writeFile(target, buffer, { mode: 0o644 });

  return {
    storedName,
    url: `/uploads/${storedName}`,
    bytes: buffer.byteLength,
    contentType,
  };
}

export async function readUpload(
  name: string,
): Promise<{ body: Buffer; contentType: string } | null> {
  if (!isStoredNameSafe(name)) return null;
  const dir = resolveUploadDir();
  const target = path.join(dir, name);
  if (!target.startsWith(dir + path.sep)) return null;
  try {
    const body = await readFile(target);
    return { body, contentType: contentTypeFor(name) };
  } catch {
    return null;
  }
}

export async function deleteUploadByUrl(url: string): Promise<boolean> {
  if (!url.startsWith("/uploads/")) return false;
  const name = url.slice("/uploads/".length);
  if (!isStoredNameSafe(name)) return false;
  const dir = resolveUploadDir();
  try {
    await unlink(path.join(dir, name));
    return true;
  } catch {
    return false;
  }
}

export function etagFor(body: Buffer): string {
  return `"${createHash("sha256").update(body).digest("hex").slice(0, 32)}"`;
}
