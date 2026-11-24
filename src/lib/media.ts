import sharp from "sharp";
import { db } from "./db";

/** Resize + compress an uploaded photo to WebP and store it. Returns the public URL. */
export async function saveImage(buf: Buffer, opts: { maxWidth?: number; alt?: string; square?: boolean } = {}) {
  let img = sharp(buf, { failOn: "none" }).rotate();
  if (opts.square) img = img.resize(1000, 1000, { fit: "cover", position: "centre" });
  else img = img.resize({ width: opts.maxWidth ?? 1400, withoutEnlargement: true });
  const out = await img.webp({ quality: 82 }).toBuffer({ resolveWithObject: true });
  const m = await db.media.create({ data: { mime: "image/webp", data: out.data, width: out.info.width, height: out.info.height, alt: opts.alt ?? null } });
  return { id: m.id, url: `/media/${m.id}`, width: m.width, height: m.height };
}
