"use client";
import { useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";
import { clearPhoto, uploadPhoto } from "@/lib/actions/admin";

/** Shrink and compress a photo in the browser: square crop for menu items, max 1800px wide for banners. */
async function resize(file: File, square: boolean): Promise<{ blob: Blob; width: number; height: number }> {
  const bmp = await createImageBitmap(file, { imageOrientation: "from-image" } as ImageBitmapOptions);
  let sx = 0, sy = 0, sw = bmp.width, sh = bmp.height, w: number, h: number;
  if (square) {
    const side = Math.min(bmp.width, bmp.height);
    sx = (bmp.width - side) / 2;
    sy = (bmp.height - side) / 2;
    sw = sh = side;
    w = h = Math.min(1000, side);
  } else {
    w = Math.min(1800, bmp.width);
    h = Math.round((bmp.height / bmp.width) * w);
  }
  const cv = document.createElement("canvas");
  cv.width = w;
  cv.height = h;
  const ctx = cv.getContext("2d")!;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(bmp, sx, sy, sw, sh, 0, 0, w, h);
  const toBlob = (type: string, q: number) => new Promise<Blob | null>((r) => cv.toBlob(r, type, q));
  let blob = await toBlob("image/webp", 0.82);
  if (!blob || blob.type !== "image/webp") blob = await toBlob("image/jpeg", 0.85); // older iPhones can't make WebP
  if (!blob) throw new Error("Couldn't read that photo");
  return { blob, width: w, height: h };
}

/** Pick a photo from the phone/computer; it's resized, compressed and saved, then the page refreshes. */
export function PhotoUpload({ target, id, current, label = "Photo", square = true }: { target: "product" | "category" | "banner"; id: string; current: string | null; label?: string; square?: boolean }) {
  const ref = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(current);
  const [err, setErr] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const router = useRouter();
  const crop = square && target !== "banner";
  return (
    <div>
      <span className="label">{label}</span>
      <div className="flex items-center gap-3">
        <div className={`grid shrink-0 place-items-center overflow-hidden rounded-xl border border-dashed border-char-200 bg-char-50 ${crop ? "h-24 w-24" : "h-20 w-40"}`}>
          {preview ? <img src={preview} alt="" className="h-full w-full object-cover" /> : <span className="text-xs text-char-400">No photo</span>}
        </div>
        <div className="space-y-2">
          <input
            ref={ref}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              e.target.value = "";
              if (!f) return;
              setErr(null);
              setPreview(URL.createObjectURL(f));
              start(async () => {
                try {
                  const { blob, width, height } = await resize(f, crop);
                  const fd = new FormData();
                  fd.set("file", blob, blob.type === "image/webp" ? "photo.webp" : "photo.jpg");
                  fd.set("target", target);
                  fd.set("id", id);
                  fd.set("width", String(width));
                  fd.set("height", String(height));
                  const r = await uploadPhoto(fd);
                  if (!r.ok) throw new Error(r.error);
                  router.refresh();
                } catch (x) {
                  setErr((x as Error).message || "Upload failed");
                  setPreview(current);
                }
              });
            }}
          />
          <button type="button" className="btn-ghost btn-sm" disabled={pending} onClick={() => ref.current?.click()}>{pending ? "Uploading…" : preview ? "Change photo" : "Upload photo"}</button>
          {preview && !pending && (
            <button type="button" className="block text-xs font-bold text-char-400 underline" onClick={() => start(async () => { await clearPhoto(target, id); setPreview(null); router.refresh(); })}>Remove (use drawing)</button>
          )}
          {err && <p className="text-xs font-bold text-tomato">{err}</p>}
        </div>
      </div>
    </div>
  );
}
