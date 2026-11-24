// Receipt / kitchen-ticket layout. Produces printer-agnostic "ops" that are rendered either to
// ESC/POS bytes (Bluetooth / RawBT) or to HTML (preview + browser printing).
import type { ReceiptTemplate, ShopSettings } from "./settings";

export type Op =
  | { t: "logo" }
  | { t: "text"; text: string; align?: "left" | "center" | "right"; bold?: boolean; size?: 1 | 2; invert?: boolean }
  | { t: "cols"; left: string; right: string; bold?: boolean; size?: 1 | 2 }
  | { t: "rule"; char?: string }
  | { t: "qr"; data: string }
  | { t: "feed"; n: number }
  | { t: "cut" }
  | { t: "drawer" };

export interface PrintItem { name: string; sizeName?: string | null; crustName?: string | null; quantity: number; lineTotal: number; summary?: string | null; note?: string | null }
export interface PrintOrder {
  number: number;
  channel: string;
  type: string;
  createdAt: string;
  customerName?: string | null;
  customerPhone?: string | null;
  address?: string | null;
  landmark?: string | null;
  zone?: string | null;
  table?: string | null;
  scheduledFor?: string | null;
  externalRef?: string | null;
  staff?: string | null;
  items: PrintItem[];
  subtotal: number;
  discount: number;
  discountNote?: string | null;
  deliveryFee: number;
  total: number;
  paymentMethod: string;
  paymentStatus: string;
  amountTendered?: number | null;
  changeGiven?: number | null;
  note?: string | null;
  pointsBalance?: number | null;
  pointsEarned?: number;
  pointsRedeemed?: number;
}

export const charsFor = (paper: number) => (paper === 58 ? 32 : 48);

const ascii = (s: string) =>
  (s || "")
    .replace(/[·•]/g, "-")
    .replace(/[–—]/g, "-")
    .replace(/×/g, "x")
    .replace(/[‘’]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/[^\x20-\x7E]/g, "");

const amt = (n: number) => (Math.round(n * 100) / 100).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const TYPE: Record<string, string> = { DELIVERY: "DELIVERY", TAKEAWAY: "TAKEAWAY", DINE_IN: "DINE-IN" };
const PAY: Record<string, string> = { CASH: "Cash", CARD: "Card", PAYHERE: "Online card", UBER: "Uber Eats", PICKME: "PickMe Food" };

function when(iso: string) {
  return new Date(iso).toLocaleString("en-GB", { timeZone: "Asia/Colombo", day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", hour12: true });
}

export function receiptOps(o: PrintOrder, tpl: ReceiptTemplate, shop: ShopSettings, opts: { pointName?: string; openDrawer?: boolean } = {}): Op[] {
  const ops: Op[] = [];
  if (tpl.showLogo) ops.push({ t: "logo" });
  tpl.headerLines.forEach((l, i) => ops.push({ t: "text", text: ascii(l), align: "center", bold: i === 0, size: i === 0 ? 2 : 1 }));
  if (tpl.showAddress) ops.push({ t: "text", text: ascii(shop.address), align: "center" });
  if (tpl.showPhone) ops.push({ t: "text", text: ascii(shop.phone), align: "center" });
  ops.push({ t: "rule", char: "=" });
  ops.push({ t: "text", text: `ORDER #${1000 + o.number}`, align: "center", bold: true, size: 2 });
  if (tpl.showOrderType) {
    const ch = o.channel === "UBER" ? " (Uber)" : o.channel === "PICKME" ? " (PickMe)" : o.channel === "WEB" ? " (Online)" : o.channel === "QR" ? " (QR)" : "";
    ops.push({ t: "text", text: `${TYPE[o.type] ?? o.type}${ch}${o.table ? ` - TABLE ${o.table}` : ""}`, align: "center", bold: true, invert: true });
  }
  ops.push({ t: "text", text: when(o.createdAt), align: "center" });
  if (o.externalRef) ops.push({ t: "text", text: `Ref: ${ascii(o.externalRef)}`, align: "center" });
  if (o.scheduledFor) ops.push({ t: "text", text: `SCHEDULED: ${when(o.scheduledFor)}`, align: "center", bold: true });
  if (tpl.showCashier && o.staff) ops.push({ t: "text", text: `Served by ${ascii(o.staff)}`, align: "center" });
  if (tpl.showCustomer && (o.customerName || o.customerPhone)) {
    ops.push({ t: "rule" });
    if (o.customerName) ops.push({ t: "text", text: `Customer: ${ascii(o.customerName)}` });
    if (o.customerPhone) ops.push({ t: "text", text: `Phone: 0${o.customerPhone.slice(2)}` });
    if (o.type === "DELIVERY" && o.address) ops.push({ t: "text", text: `Address: ${ascii(o.address)}${o.zone ? ` (${ascii(o.zone)})` : ""}` });
    if (o.type === "DELIVERY" && o.landmark) ops.push({ t: "text", text: `Landmark: ${ascii(o.landmark)}` });
  }
  ops.push({ t: "rule" });
  for (const i of o.items) {
    ops.push({ t: "cols", left: `${i.quantity} x ${ascii(i.name)}`, right: amt(i.lineTotal), bold: true });
    const sub = [i.sizeName, i.crustName].filter(Boolean).join(", ");
    if (sub) ops.push({ t: "text", text: `    ${ascii(sub)}` });
    if (tpl.showModifiers && i.summary) ops.push({ t: "text", text: `    ${ascii(i.summary)}` });
    if (i.note) ops.push({ t: "text", text: `    Note: ${ascii(i.note)}` });
  }
  ops.push({ t: "rule" });
  ops.push({ t: "cols", left: "Subtotal", right: amt(o.subtotal) });
  if (o.discount) ops.push({ t: "cols", left: ascii(o.discountNote || "Discount"), right: `-${amt(o.discount)}` });
  if (o.type === "DELIVERY" && o.channel !== "UBER" && o.channel !== "PICKME") ops.push({ t: "cols", left: "Delivery", right: o.deliveryFee ? amt(o.deliveryFee) : "FREE" });
  ops.push({ t: "cols", left: "TOTAL (LKR)", right: amt(o.total), bold: true, size: tpl.largeTotal ? 2 : 1 });
  ops.push({ t: "rule" });
  ops.push({ t: "cols", left: `Payment: ${PAY[o.paymentMethod] ?? o.paymentMethod}`, right: o.paymentStatus === "PAID" ? "PAID" : "UNPAID", bold: true });
  if (o.amountTendered != null) {
    ops.push({ t: "cols", left: "Cash received", right: amt(o.amountTendered) });
    ops.push({ t: "cols", left: "Change", right: amt(o.changeGiven ?? 0), bold: true });
  }
  if (tpl.showPoints && o.pointsBalance != null) {
    const name = ascii(opts.pointName || "Hungry Points");
    ops.push({ t: "rule" });
    ops.push({ t: "text", text: name.toUpperCase(), align: "center", bold: true });
    if (o.pointsRedeemed) ops.push({ t: "cols", left: "Points used", right: `-${o.pointsRedeemed}` });
    if (o.pointsEarned) ops.push({ t: "cols", left: "Points you'll earn", right: `+${o.pointsEarned}` });
    ops.push({ t: "cols", left: "Balance", right: `${o.pointsBalance}`, bold: true });
  }
  if (o.note) {
    ops.push({ t: "rule" });
    ops.push({ t: "text", text: `Note: ${ascii(o.note)}` });
  }
  ops.push({ t: "feed", n: 1 });
  tpl.footerLines.forEach((l) => ops.push({ t: "text", text: ascii(l), align: "center" }));
  if (tpl.showQr && tpl.qrText) {
    ops.push({ t: "feed", n: 1 });
    ops.push({ t: "qr", data: tpl.qrText });
  }
  ops.push({ t: "feed", n: 3 });
  ops.push({ t: "cut" });
  if (opts.openDrawer) ops.push({ t: "drawer" });
  return ops;
}

/** Kitchen order ticket — big, no prices */
export function kotOps(o: PrintOrder): Op[] {
  const ops: Op[] = [];
  ops.push({ t: "text", text: "KITCHEN", align: "center", bold: true, invert: true });
  ops.push({ t: "text", text: `#${1000 + o.number}`, align: "center", bold: true, size: 2 });
  ops.push({ t: "text", text: `${TYPE[o.type] ?? o.type}${o.table ? ` - TABLE ${o.table}` : ""}${o.channel === "UBER" ? " - UBER" : o.channel === "PICKME" ? " - PICKME" : ""}`, align: "center", bold: true, size: 2 });
  ops.push({ t: "text", text: when(o.createdAt), align: "center" });
  if (o.scheduledFor) ops.push({ t: "text", text: `FOR ${when(o.scheduledFor)}`, align: "center", bold: true });
  ops.push({ t: "rule", char: "=" });
  for (const i of o.items) {
    ops.push({ t: "text", text: `${i.quantity} x ${ascii(i.name)}`, bold: true, size: 2 });
    const sub = [i.sizeName, i.crustName].filter(Boolean).join(", ");
    if (sub) ops.push({ t: "text", text: `   ${ascii(sub)}`, bold: true });
    if (i.summary) ops.push({ t: "text", text: `   ${ascii(i.summary)}` });
    if (i.note) ops.push({ t: "text", text: `   !! ${ascii(i.note)}`, bold: true });
    ops.push({ t: "rule", char: "." });
  }
  if (o.note) ops.push({ t: "text", text: `NOTE: ${ascii(o.note)}`, bold: true });
  ops.push({ t: "feed", n: 3 });
  ops.push({ t: "cut" });
  return ops;
}

/** Wraps text to the printer width (used by both renderers) */
export function wrap(text: string, width: number): string[] {
  const out: string[] = [];
  for (const para of text.split("\n")) {
    let line = "";
    for (const word of para.split(" ")) {
      if ((line + (line ? " " : "") + word).length > width) {
        if (line) out.push(line);
        line = word.length > width ? word.slice(0, width) : word;
      } else line += (line ? " " : "") + word;
    }
    out.push(line);
  }
  return out;
}

export function colsLine(left: string, right: string, width: number) {
  const space = width - right.length - 1;
  const lines = wrap(left, space);
  const last = lines.pop() ?? "";
  return [...lines, last.padEnd(space, " ") + " " + right];
}
