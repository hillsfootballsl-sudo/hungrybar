"use client";
import Image from "next/image";
import { useState } from "react";
import type { PrintConfig, usePrinter } from "@/components/staff/printing";
import { Keypad } from "@/components/staff/ui";
import type { StaffSession } from "@/lib/jwt";
import { printOps } from "@/lib/printer";
import { money } from "@/lib/pricing";
import type { Op } from "@/lib/receipt";

export interface ShiftSummary {
  shift: { id: string; openedAt: string; openingCash: number; staff: { name: string }; movements: { id: string; type: string; amount: number; reason: string; createdAt: string }[] };
  by: Record<string, { count: number; total: number }>;
  sales: number;
  discounts: number;
  orders: number;
  cancelled: number;
  cashIn: number;
  cashOut: number;
  expectedCash: number;
}

export function ShiftModal({ summary, staff, onChange, print, printer, inline }: { summary: ShiftSummary | null; staff: StaffSession; onChange: (s: ShiftSummary | null) => void; print: PrintConfig; printer: ReturnType<typeof usePrinter>; inline?: boolean }) {
  const [amount, setAmount] = useState("");
  const [reason, setReason] = useState("");
  const [view, setView] = useState<"main" | "in" | "out" | "close">("main");
  const [err, setErr] = useState<string | null>(null);

  const post = async (body: Record<string, unknown>) => {
    setErr(null);
    const r = await fetch("/api/pos/shift", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const j = await r.json();
    if (!r.ok) {
      setErr(j.error);
      return null;
    }
    return j;
  };

  const zReport = (s: ShiftSummary, counted: number): Op[] => [
    { t: "text", text: "SHIFT REPORT (Z)", align: "center", bold: true, size: 2 },
    { t: "text", text: `${s.shift.staff.name} - opened ${new Date(s.shift.openedAt).toLocaleString("en-GB", { timeZone: "Asia/Colombo" })}`, align: "center" },
    { t: "text", text: `Closed ${new Date().toLocaleString("en-GB", { timeZone: "Asia/Colombo" })}`, align: "center" },
    { t: "rule", char: "=" },
    { t: "cols", left: "Orders", right: String(s.orders) },
    { t: "cols", left: "Cancelled", right: String(s.cancelled) },
    { t: "cols", left: "Discounts given", right: s.discounts.toFixed(2) },
    ...Object.entries(s.by).map(([k, v]) => ({ t: "cols", left: `${k} (${v.count})`, right: v.total.toFixed(2) }) as Op),
    { t: "cols", left: "TOTAL SALES", right: s.sales.toFixed(2), bold: true },
    { t: "rule" },
    { t: "cols", left: "Opening float", right: s.shift.openingCash.toFixed(2) },
    { t: "cols", left: "Cash in", right: s.cashIn.toFixed(2) },
    { t: "cols", left: "Cash out", right: `-${s.cashOut.toFixed(2)}` },
    { t: "cols", left: "Expected in drawer", right: s.expectedCash.toFixed(2), bold: true },
    { t: "cols", left: "Counted", right: counted.toFixed(2), bold: true },
    { t: "cols", left: "Difference", right: (counted - s.expectedCash).toFixed(2), bold: true },
    { t: "feed", n: 3 },
    { t: "cut" },
  ];

  if (!summary)
    return (
      <div className={`w-full max-w-sm rounded-2xl bg-white p-6 ${inline ? "shadow-2xl" : ""}`}>
        <div className="mb-4 flex items-center gap-3">
          <Image src="/brand/logo.png" alt="" width={56} height={56} />
          <div>
            <p className="font-condensed text-2xl uppercase">Open shift</p>
            <p className="text-sm text-char-400">Hi {staff.name}! Count the cash in the drawer.</p>
          </div>
        </div>
        <Keypad value={amount} onChange={setAmount} />
        {err && <p className="mt-2 text-sm font-bold text-tomato">{err}</p>}
        <button className="btn-primary mt-4 h-14 w-full text-lg" onClick={async () => { const j = await post({ action: "open", openingCash: Number(amount) || 0 }); if (j) onChange(j.summary); }}>
          Open with {money(Number(amount) || 0)}
        </button>
        <a href="/staff/login" className="mt-3 block text-center text-sm text-char-400 underline">Switch user</a>
      </div>
    );

  return (
    <div>
      {view === "main" && (
        <>
          <p className="text-sm text-char-400">Opened by {summary.shift.staff.name} · {new Date(summary.shift.openedAt).toLocaleTimeString("en-GB", { timeZone: "Asia/Colombo", hour: "2-digit", minute: "2-digit" })}</p>
          <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
            <div className="rounded-xl bg-cream-100 p-3"><p className="text-char-400">Sales</p><p className="font-display text-2xl">{money(summary.sales)}</p></div>
            <div className="rounded-xl bg-cream-100 p-3"><p className="text-char-400">Expected cash</p><p className="font-display text-2xl">{money(summary.expectedCash)}</p></div>
            {Object.entries(summary.by).map(([k, v]) => (
              <div key={k} className="flex justify-between rounded-lg bg-char-50 px-3 py-2"><span>{k} ({v.count})</span><b>{money(v.total)}</b></div>
            ))}
          </div>
          {summary.shift.movements.length > 0 && (
            <ul className="mt-3 space-y-1 text-sm">
              {summary.shift.movements.map((m) => (
                <li key={m.id} className="flex justify-between"><span>{m.type === "IN" ? "➕" : "➖"} {m.reason}</span><span>{money(m.amount)}</span></li>
              ))}
            </ul>
          )}
          <div className="mt-4 grid grid-cols-2 gap-2">
            <button className="btn-ghost" onClick={() => { setView("in"); setAmount(""); setReason(""); }}>➕ Cash in</button>
            <button className="btn-ghost" onClick={() => { setView("out"); setAmount(""); setReason(""); }}>➖ Cash out</button>
            <button className="btn-dark col-span-2" onClick={() => { setView("close"); setAmount(""); }}>Close shift (Z report)</button>
          </div>
        </>
      )}
      {(view === "in" || view === "out") && (
        <>
          <div className="mb-2 flex flex-wrap gap-2">
            {(view === "out" ? ["Gas", "Vegetables", "Rider fuel", "Supplier", "Bank deposit"] : ["Change float", "Owner top-up"]).map((r) => (
              <button key={r} onClick={() => setReason(r)} className={`rounded-lg px-3 py-1 text-sm font-bold ${reason === r ? "bg-char text-cream" : "bg-char-50"}`}>{r}</button>
            ))}
          </div>
          <input className="input mb-2" placeholder="Reason" value={reason} onChange={(e) => setReason(e.target.value)} />
          <Keypad value={amount} onChange={setAmount} />
          {err && <p className="mt-2 text-sm font-bold text-tomato">{err}</p>}
          <div className="mt-3 grid grid-cols-2 gap-2">
            <button className="btn-ghost" onClick={() => setView("main")}>Back</button>
            <button className="btn-primary" disabled={!Number(amount) || !reason} onClick={async () => { const j = await post({ action: "move", type: view === "in" ? "IN" : "OUT", amount: Number(amount), reason }); if (j) { onChange(j.summary); setView("main"); } }}>Save</button>
          </div>
        </>
      )}
      {view === "close" && (
        <>
          <p className="mb-2 text-sm">Count the drawer. Expected: <b>{money(summary.expectedCash)}</b></p>
          <Keypad value={amount} onChange={setAmount} />
          {amount && <p className={`mt-2 text-center font-bold ${Number(amount) - summary.expectedCash < 0 ? "text-tomato" : "text-basil"}`}>Difference: {money(Number(amount) - summary.expectedCash)}</p>}
          {err && <p className="mt-2 text-sm font-bold text-tomato">{err}</p>}
          <div className="mt-3 grid grid-cols-2 gap-2">
            <button className="btn-ghost" onClick={() => setView("main")}>Back</button>
            <button
              className="btn-primary"
              disabled={amount === ""}
              onClick={async () => {
                const counted = Number(amount) || 0;
                const j = await post({ action: "close", closingCash: counted });
                if (j) {
                  try {
                    await printOps(zReport(j.summary, counted), { paperWidth: print.receipt.paperWidth, logoWidth: 0 });
                  } catch {}
                  void printer;
                  onChange(null);
                }
              }}
            >
              Close & print Z
            </button>
          </div>
        </>
      )}
    </div>
  );
}
