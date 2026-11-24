"use client";
import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { PrinterControl, usePrinter } from "@/components/staff/printing";
import { useToasts } from "@/components/staff/ui";
import { saveSettings } from "@/lib/actions/admin";
import { fillQrs, opsToHtml } from "@/lib/printer";
import { kotOps, type PrintOrder, receiptOps } from "@/lib/receipt";
import type { ReceiptTemplate, ShopSettings } from "@/lib/settings";

const SAMPLE: PrintOrder = {
  number: 342, channel: "POS", type: "TAKEAWAY", createdAt: new Date().toISOString(), customerName: "Ayesha", customerPhone: "94771234567", staff: "Cashier",
  items: [
    { name: "Tandoori Chicken", sizeName: "2 Person", crustName: "Thick · Hand-tossed", quantity: 1, lineTotal: 2290, summary: "+Tandoori Chicken · No Onion Wedges" },
    { name: "Classic Mint Mojito", quantity: 2, lineTotal: 1180 },
    { name: "Garlic Bread", quantity: 2, lineTotal: 200, note: "extra crispy" },
  ],
  subtotal: 3670, discount: 0, deliveryFee: 0, total: 3670, paymentMethod: "CASH", paymentStatus: "PAID", amountTendered: 5000, changeGiven: 1330, pointsBalance: 845, pointsEarned: 367,
};

export function ReceiptDesigner({ initial, shop, pointName }: { initial: ReceiptTemplate; shop: ShopSettings; pointName: string }) {
  const [t, setT] = useState(initial);
  const [kind, setKind] = useState<"receipt" | "kot">("receipt");
  const [saved, setSaved] = useState(true);
  const [pending, start] = useTransition();
  const { toast, view } = useToasts();
  const printer = usePrinter({ receipt: t, shop, pointName }, toast);
  const ref = useRef<HTMLDivElement>(null);
  const html = useMemo(() => opsToHtml(kind === "receipt" ? receiptOps(SAMPLE, t, shop, { pointName }) : kotOps(SAMPLE), t.paperWidth), [t, shop, kind, pointName]);
  useEffect(() => {
    if (ref.current) void fillQrs(ref.current);
  }, [html]);
  const up = (p: Partial<ReceiptTemplate>) => {
    setT((x) => ({ ...x, ...p }));
    setSaved(false);
  };
  const Toggle = ({ k, label }: { k: keyof ReceiptTemplate; label: string }) => (
    <label className="flex items-center gap-2 text-sm"><input type="checkbox" className="h-4 w-4 accent-tomato" checked={!!t[k]} onChange={(e) => up({ [k]: e.target.checked } as Partial<ReceiptTemplate>)} />{label}</label>
  );
  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_auto]">
      {view}
      <div className="space-y-4">
        <section className="card grid gap-3 p-4 md:grid-cols-2">
          <label><span className="label">Paper width</span>
            <select className="input" value={t.paperWidth} onChange={(e) => up({ paperWidth: Number(e.target.value) as 58 | 80 })}><option value={80}>80 mm (48 chars)</option><option value={58}>58 mm (32 chars)</option></select>
          </label>
          <label><span className="label">Copies per receipt</span><input className="input" type="number" min={1} max={3} value={t.copies} onChange={(e) => up({ copies: Number(e.target.value) })} /></label>
          <label className="md:col-span-2"><span className="label">Header lines (one per line — first line printed large)</span>
            <textarea className="input min-h-[90px] font-mono" value={t.headerLines.join("\n")} onChange={(e) => up({ headerLines: e.target.value.split("\n").slice(0, 6) })} />
          </label>
          <label className="md:col-span-2"><span className="label">Footer lines</span>
            <textarea className="input min-h-[90px] font-mono" value={t.footerLines.join("\n")} onChange={(e) => up({ footerLines: e.target.value.split("\n").slice(0, 8) })} />
          </label>
          <label><span className="label">QR code link (feedback, Instagram, menu…)</span><input className="input" value={t.qrText} onChange={(e) => up({ qrText: e.target.value })} /></label>
          <label><span className="label">Logo width (printer dots, 80mm ≈ 576 max)</span><input className="input" type="number" step={8} min={64} max={576} value={t.logoWidth} onChange={(e) => up({ logoWidth: Number(e.target.value) })} /></label>
        </section>
        <section className="card grid gap-2 p-4 sm:grid-cols-2">
          <Toggle k="showLogo" label="Print logo" />
          <Toggle k="showAddress" label="Shop address" />
          <Toggle k="showPhone" label="Shop phone" />
          <Toggle k="showOrderType" label="Order type banner" />
          <Toggle k="showCustomer" label="Customer & delivery details" />
          <Toggle k="showCashier" label="Cashier name" />
          <Toggle k="showModifiers" label="Topping changes per item" />
          <Toggle k="showPoints" label="Points earned & balance" />
          <Toggle k="showQr" label="QR code" />
          <Toggle k="largeTotal" label="Large total" />
          <Toggle k="autoPrint" label="Auto-print after each sale" />
          <Toggle k="printKot" label="Also print kitchen ticket" />
        </section>
        <div className="flex flex-wrap items-center gap-2">
          <button className="btn-primary" disabled={pending || saved} onClick={() => start(async () => { const r = await saveSettings("receipt", t); if (r.ok) { setSaved(true); toast("Receipt design saved"); } else toast(r.error, true); })}>
            {saved ? "Saved ✓" : pending ? "Saving…" : "Save design"}
          </button>
          <button className="btn-ghost" onClick={() => (kind === "receipt" ? printer.printReceipt(SAMPLE as never) : printer.printKot(SAMPLE as never))}>Test print</button>
          <div className="rounded-lg bg-char text-cream"><PrinterControl printer={printer} /></div>
        </div>
      </div>
      <div>
        <div className="mb-2 flex gap-1">
          {(["receipt", "kot"] as const).map((k) => (
            <button key={k} onClick={() => setKind(k)} className={`rounded-lg px-3 py-1.5 text-sm font-bold ${kind === k ? "bg-char text-cream" : "bg-white"}`}>{k === "receipt" ? "Customer receipt" : "Kitchen ticket"}</button>
          ))}
        </div>
        <div className="rounded-sm bg-white p-4 shadow-xl" style={{ width: t.paperWidth === 58 ? 240 : 330, fontFamily: "ui-monospace, Menlo, Consolas, monospace", fontSize: t.paperWidth === 58 ? 10.4 : 10.2, color: "#111", backgroundImage: "linear-gradient(transparent 97%, #f3f3f3 97%)" }}>
          <div ref={ref} dangerouslySetInnerHTML={{ __html: html }} />
        </div>
      </div>
    </div>
  );
}
