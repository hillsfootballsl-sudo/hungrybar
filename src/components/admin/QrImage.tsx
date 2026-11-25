"use client";
import QR from "qrcode";
import { useEffect, useState } from "react";

/** QR code drawn in the browser (keeps the server light) */
export function QrImage({ text, label }: { text: string; label: string }) {
  const [src, setSrc] = useState<string | null>(null);
  useEffect(() => {
    QR.toDataURL(text, { margin: 1, width: 360, color: { dark: "#262626", light: "#FFFFFF" } }).then(setSrc).catch(() => setSrc(null));
  }, [text]);
  return src ? <img src={src} alt={label} width={180} height={180} className="mx-auto" /> : <div className="mx-auto h-[180px] w-[180px] animate-pulse rounded bg-char-50" />;
}
