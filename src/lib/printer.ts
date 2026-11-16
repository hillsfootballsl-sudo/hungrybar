"use client";
// Printer transport for the POS tablet:
//  • "bluetooth" — Web Bluetooth (Chrome on Android) straight to a BLE ESC/POS printer
//  • "rawbt"     — hands the bytes to the RawBT app (for Bluetooth-Classic-only printers)
//  • "browser"   — normal print dialog (USB/Wi-Fi printers, or as a fallback)
import { encodeEscPos } from "./escpos";
import { charsFor, colsLine, type Op, wrap } from "./receipt";

export type PrintMode = "bluetooth" | "rawbt" | "browser";

const SERVICES = [
  "000018f0-0000-1000-8000-00805f9b34fb",
  "0000ff00-0000-1000-8000-00805f9b34fb",
  "0000ffe0-0000-1000-8000-00805f9b34fb",
  "0000fee7-0000-1000-8000-00805f9b34fb",
  "49535343-fe7d-4ae5-8fa9-9fafd205e455",
  "e7810a71-73ae-499d-8c15-faa9aef0c3f2",
];

type BTChar = { writeValue: (d: BufferSource) => Promise<void>; writeValueWithoutResponse?: (d: BufferSource) => Promise<void>; properties: { write: boolean; writeWithoutResponse: boolean } };
type BTDevice = { name?: string; gatt?: { connected: boolean; connect: () => Promise<{ getPrimaryServices: () => Promise<{ getCharacteristics: () => Promise<BTChar[]> }[]> }> }; addEventListener: (e: string, f: () => void) => void };

let device: BTDevice | null = null;
let characteristic: BTChar | null = null;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());
export const onPrinterChange = (f: () => void) => {
  listeners.add(f);
  return () => listeners.delete(f);
};

export function printerState() {
  return { name: device?.name ?? null, connected: !!(device?.gatt?.connected && characteristic) };
}

export function getMode(): PrintMode {
  try {
    return (localStorage.getItem("hb_print_mode") as PrintMode) || "bluetooth";
  } catch {
    return "bluetooth";
  }
}
export function setMode(m: PrintMode) {
  try {
    localStorage.setItem("hb_print_mode", m);
  } catch {}
  emit();
}

export function bluetoothSupported() {
  return typeof navigator !== "undefined" && "bluetooth" in navigator;
}

async function findCharacteristic(d: BTDevice) {
  const server = await d.gatt!.connect();
  const services = await server.getPrimaryServices();
  for (const s of services) {
    const chars = await s.getCharacteristics().catch(() => []);
    const c = chars.find((x) => x.properties.writeWithoutResponse || x.properties.write);
    if (c) return c;
  }
  throw new Error("This printer has no writable channel. Try RawBT mode.");
}

export async function connectBluetooth() {
  const bt = (navigator as unknown as { bluetooth: { requestDevice: (o: unknown) => Promise<BTDevice> } }).bluetooth;
  device = await bt.requestDevice({ acceptAllDevices: true, optionalServices: SERVICES });
  device.addEventListener("gattserverdisconnected", () => {
    characteristic = null;
    emit();
  });
  characteristic = await findCharacteristic(device);
  emit();
  return device.name ?? "Printer";
}

async function ensureConnected() {
  if (device && (!device.gatt?.connected || !characteristic)) characteristic = await findCharacteristic(device);
  if (!characteristic) throw new Error("Printer not connected");
}

async function writeBluetooth(bytes: Uint8Array) {
  await ensureConnected();
  const c = characteristic!;
  const chunk = 180;
  for (let i = 0; i < bytes.length; i += chunk) {
    const part = bytes.slice(i, i + chunk);
    if (c.properties.writeWithoutResponse && c.writeValueWithoutResponse) await c.writeValueWithoutResponse(part);
    else await c.writeValue(part);
    await new Promise((r) => setTimeout(r, 12));
  }
}

function toBase64(bytes: Uint8Array) {
  let s = "";
  for (let i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]);
  return btoa(s);
}

// ───────── logo → 1-bit raster (Floyd–Steinberg dithering) ─────────
let logoCache: { key: string; v: { width: number; height: number; data: Uint8Array } } | null = null;
export async function loadLogo(widthDots: number, src = "/brand/logo.png") {
  const w = Math.max(64, Math.floor(widthDots / 8) * 8);
  const key = `${src}@${w}`;
  if (logoCache?.key === key) return logoCache.v;
  const img = new Image();
  img.src = src;
  await img.decode();
  const h = Math.round((img.height / img.width) * w);
  const cv = document.createElement("canvas");
  cv.width = w;
  cv.height = h;
  const ctx = cv.getContext("2d")!;
  ctx.fillStyle = "#fff";
  ctx.fillRect(0, 0, w, h);
  ctx.drawImage(img, 0, 0, w, h);
  const px = ctx.getImageData(0, 0, w, h).data;
  const g = new Float32Array(w * h);
  for (let i = 0; i < w * h; i++) g[i] = 0.299 * px[i * 4] + 0.587 * px[i * 4 + 1] + 0.114 * px[i * 4 + 2];
  const data = new Uint8Array((w / 8) * h);
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      const i = y * w + x;
      const old = g[i];
      const black = old < 140;
      const err = old - (black ? 0 : 255);
      if (black) data[y * (w / 8) + (x >> 3)] |= 0x80 >> (x & 7);
      if (x + 1 < w) g[i + 1] += (err * 7) / 16;
      if (y + 1 < h) {
        if (x > 0) g[i + w - 1] += (err * 3) / 16;
        g[i + w] += (err * 5) / 16;
        if (x + 1 < w) g[i + w + 1] += err / 16;
      }
    }
  const v = { width: w, height: h, data };
  logoCache = { key, v };
  return v;
}

// ───────── HTML rendering (preview + browser print) ─────────
export function opsToHtml(ops: Op[], paperWidth: number, logoSrc = "/brand/logo.png") {
  const W = charsFor(paperWidth);
  const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;");
  let html = "";
  for (const op of ops) {
    if (op.t === "logo") html += `<div style="text-align:center"><img src="${logoSrc}" style="width:45%;filter:grayscale(1) contrast(1.4)"/></div>`;
    else if (op.t === "text") {
      const width = op.size === 2 ? Math.floor(W / 2) : W;
      const lines = wrap(op.invert ? ` ${op.text} ` : op.text, width);
      html += `<div style="text-align:${op.align ?? "left"};font-weight:${op.bold ? 700 : 400};font-size:${op.size === 2 ? "2em" : "1em"};line-height:1.15">${lines
        .map((l) => (op.invert ? `<span style="background:#000;color:#fff">${esc(l)}</span>` : esc(l)))
        .join("<br/>")}</div>`;
    } else if (op.t === "cols") {
      const width = op.size === 2 ? Math.floor(W / 2) : W;
      html += `<div style="white-space:pre;font-weight:${op.bold ? 700 : 400};font-size:${op.size === 2 ? "2em" : "1em"}">${colsLine(op.left, op.right, width).map(esc).join("\n")}</div>`;
    } else if (op.t === "rule") html += `<div style="white-space:pre;overflow:hidden">${esc((op.char ?? "-").repeat(W))}</div>`;
    else if (op.t === "qr") html += `<div style="text-align:center;margin:6px 0"><img data-qr="${esc(op.data)}" style="width:40%"/></div>`;
    else if (op.t === "feed") html += `<div style="height:${op.n * 0.9}em"></div>`;
    else if (op.t === "cut") html += `<div style="border-top:1px dashed #999;margin:6px 0"></div>`;
  }
  return html;
}

async function fillQrs(root: ParentNode) {
  const QR = (await import("qrcode")).default;
  for (const img of Array.from(root.querySelectorAll<HTMLImageElement>("img[data-qr]"))) img.src = await QR.toDataURL(img.dataset.qr!, { margin: 0, width: 240 });
}
export { fillQrs };

function printHtml(html: string, paperWidth: number) {
  const iframe = document.createElement("iframe");
  iframe.style.position = "fixed";
  iframe.style.right = "0";
  iframe.style.bottom = "0";
  iframe.style.width = "0";
  iframe.style.height = "0";
  iframe.style.border = "0";
  document.body.appendChild(iframe);
  const doc = iframe.contentDocument!;
  doc.open();
  doc.write(`<!doctype html><html><head><style>@page{size:${paperWidth}mm auto;margin:2mm}body{font-family:ui-monospace,Menlo,Consolas,monospace;font-size:${paperWidth === 58 ? 9 : 11}px;width:${paperWidth - 6}mm;margin:0;color:#000}</style></head><body>${html}</body></html>`);
  doc.close();
  void fillQrs(doc).then(() =>
    setTimeout(() => {
      iframe.contentWindow?.focus();
      iframe.contentWindow?.print();
      setTimeout(() => iframe.remove(), 2000);
    }, 300),
  );
}

export async function printOps(ops: Op[], opts: { paperWidth: number; logoWidth: number; copies?: number }) {
  const mode = getMode();
  const copies = Math.max(1, opts.copies ?? 1);
  if (mode === "browser") {
    printHtml(Array.from({ length: copies }, () => opsToHtml(ops, opts.paperWidth)).join(""), opts.paperWidth);
    return;
  }
  const logo = ops.some((o) => o.t === "logo") ? await loadLogo(opts.logoWidth).catch(() => null) : null;
  const one = encodeEscPos(ops, opts.paperWidth, logo);
  const bytes = new Uint8Array(one.length * copies);
  for (let i = 0; i < copies; i++) bytes.set(one, i * one.length);
  if (mode === "rawbt") {
    window.location.href = "rawbt:base64," + toBase64(bytes);
    return;
  }
  await writeBluetooth(bytes);
}
