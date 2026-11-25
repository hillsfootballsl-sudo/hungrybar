import { db } from "./db";

const ALLOWED = ["image/webp", "image/jpeg", "image/png"];

/** Store an already-resized photo (the admin page shrinks it in the browser first). Returns its public URL. */
export async function saveImage(bytes: Uint8Array, mime: string, width: number, height: number, alt?: string) {
  if (!ALLOWED.includes(mime)) throw new Error("Use a JPG, PNG or WebP photo");
  if (bytes.length > 3 * 1024 * 1024) throw new Error("Photo is too large after resizing (max 3 MB)");
  const m = await db.media.create({ data: { mime, data: Buffer.from(bytes), width: Math.round(width) || 0, height: Math.round(height) || 0, alt: alt ?? null } });
  return { id: m.id, url: `/media/${m.id}`, width: m.width, height: m.height };
}
