"use client";
import { useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";
import { clearPhoto, uploadPhoto } from "@/lib/actions/admin";

/** Pick a photo from the phone/computer; it's resized, compressed and saved, then the page refreshes. */
export function PhotoUpload({ target, id, current, label = "Photo", square = true }: { target: "product" | "category" | "banner"; id: string; current: string | null; label?: string; square?: boolean }) {
  const ref = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(current);
  const [err, setErr] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const router = useRouter();
  return (
    <div>
      <span className="label">{label}</span>
      <div className="flex items-center gap-3">
        <div className={`grid shrink-0 place-items-center overflow-hidden rounded-xl border border-dashed border-char-200 bg-char-50 ${square ? "h-24 w-24" : "h-20 w-40"}`}>
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
              if (!f) return;
              setErr(null);
              setPreview(URL.createObjectURL(f));
              const fd = new FormData();
              fd.set("file", f);
              fd.set("target", target);
              fd.set("id", id);
              start(async () => {
                const r = await uploadPhoto(fd);
                if (!r.ok) {
                  setErr(r.error);
                  setPreview(current);
                } else router.refresh();
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
