"use client";
import { useEffect, useState } from "react";
import type { usePrinter } from "@/components/staff/printing";
import { elapsed, Keypad, Modal } from "@/components/staff/ui";
import type { Ticket } from "@/lib/orderView";
import { money } from "@/lib/pricing";
import { PayModal } from "./PayModal";

const STATUS_STYLE: Record<string, string> = {
  PENDING: "bg-tomato text-white",
  CONFIRMED: "bg-mustard",
  PREPARING: "bg-orange-300",
  READY: "bg-basil text-white",
  OUT_FOR_DELIVERY: "bg-sky-500 text-white",
};

export function OrdersPanel({
  open, onClose, orders, reload, printer, toast, riders, isManager, onSettle,
}: {
  open: boolean; onClose: () => void; orders: Ticket[]; reload: () => void; printer: ReturnType<typeof usePrinter>; toast: (m: string, bad?: boolean) => void;
  riders: { id: string; name: string }[]; isManager: boolean; onSettle: (o: Ticket, pay: { method: "CASH" | "CARD"; tendered?: number | null }) => Promise<void>;
}) {
  const [tab, setTab] = useState<"new" | "active" | "unpaid">("new");
  const [now, setNow] = useState(Date.now());
  const [settle, setSettle] = useState<Ticket | null>(null);
  const [cancel, setCancel] = useState<Ticket | null>(null);
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 20000);
    return () => clearInterval(t);
  }, []);
  const pending = orders.filter((o) => o.status === "PENDING");
  const active = orders.filter((o) => !["PENDING", "COMPLETED", "CANCELLED"].includes(o.status));
  const unpaid = orders.filter((o) => o.paymentStatus === "UNPAID" && o.status !== "PENDING" && !["UBER", "PICKME"].includes(o.channel));
  useEffect(() => {
    if (open && pending.length) setTab("new");
  }, [open, pending.length]);

  const act = async (o: Ticket, body: Record<string, unknown>, after?: (t: Ticket) => void) => {
    const r = await fetch(`/api/staff/orders/${o.id}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const j = await r.json();
    if (!r.ok) return toast(j.error, true);
    after?.(j);
    reload();
  };

  const list = tab === "new" ? pending : tab === "active" ? active : unpaid;
  return (
    <>
      <div className={`fixed inset-0 z-50 ${open ? "" : "pointer-events-none"}`}>
        <div className={`absolute inset-0 bg-char/50 transition ${open ? "opacity-100" : "opacity-0"}`} onClick={onClose} />
        <aside className={`absolute right-0 top-0 flex h-full w-full max-w-xl flex-col bg-[#F6F3EE] shadow-2xl transition-transform ${open ? "translate-x-0" : "translate-x-full"}`}>
          <div className="flex items-center justify-between bg-char p-3 text-cream">
            <div className="flex gap-1">
              {([["new", `🔔 New (${pending.length})`], ["active", `🔥 Active (${active.length})`], ["unpaid", `💵 Unpaid (${unpaid.length})`]] as const).map(([k, l]) => (
                <button key={k} onClick={() => setTab(k)} className={`rounded-lg px-3 py-2 text-sm font-bold ${tab === k ? "bg-tomato" : "bg-white/10"}`}>{l}</button>
              ))}
            </div>
            <button onClick={onClose} className="px-2 text-xl">✕</button>
          </div>
          <div className="flex-1 space-y-3 overflow-y-auto p-3">
            {list.length === 0 && <p className="p-10 text-center text-char-300">Nothing here.</p>}
            {list.map((o) => (
              <div key={o.id} className="card bg-white p-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-display text-xl">#{1000 + o.number} <span className={`ml-1 rounded px-2 py-0.5 align-middle font-sans text-xs font-bold ${STATUS_STYLE[o.status] ?? "bg-char-50"}`}>{o.status.replaceAll("_", " ")}</span></p>
                    <p className="text-sm text-char-500">
                      {o.channel} · {o.type.replace("_", "-")}{o.table ? ` · Table ${o.table}` : ""} · {elapsed(o.createdAt, now)} ago
                    </p>
                    {(o.customerName || o.customerPhone) && <p className="text-sm">{o.customerName} {o.customerPhone ? `· 0${o.customerPhone.slice(2)}` : ""}</p>}
                    {o.address && <p className="text-sm text-char-500">📍 {o.address}{o.zone ? ` (${o.zone})` : ""}{o.landmark ? ` — ${o.landmark}` : ""}</p>}
                    {o.scheduledFor && <p className="text-sm font-bold text-tomato">⏰ Scheduled {new Date(o.scheduledFor).toLocaleString("en-GB", { timeZone: "Asia/Colombo", weekday: "short", hour: "2-digit", minute: "2-digit" })}</p>}
                  </div>
                  <div className="text-right">
                    <p className="font-bold">{money(o.total)}</p>
                    <p className={`text-xs font-bold ${o.paymentStatus === "PAID" ? "text-basil" : "text-tomato"}`}>{o.paymentMethod} · {o.paymentStatus}</p>
                  </div>
                </div>
                <ul className="mt-2 border-t border-dashed border-char-100 pt-2 text-sm">
                  {o.items.map((i) => (
                    <li key={i.id}>
                      <b>{i.quantity}×</b> {i.name}{i.sizeName ? ` (${i.sizeName})` : ""} {i.summary && <span className="text-tomato-700">— {i.summary}</span>}
                      {i.note && <span className="italic text-char-400"> “{i.note}”</span>}
                    </li>
                  ))}
                </ul>
                {o.note && <p className="mt-1 text-sm italic">Note: {o.note}</p>}
                <div className="mt-3 flex flex-wrap gap-2">
                  {o.status === "PENDING" && (
                    <>
                      <button className="btn-primary" onClick={() => act(o, { status: "CONFIRMED" }, async (t) => { await printer.printKot(t); toast(`Accepted #${1000 + t.number}`); })}>✓ Accept & print</button>
                      <button className="btn-ghost" onClick={() => setCancel(o)}>Reject</button>
                    </>
                  )}
                  {o.status === "CONFIRMED" && <button className="btn-ghost" onClick={() => act(o, { status: "PREPARING" })}>🔥 Preparing</button>}
                  {["CONFIRMED", "PREPARING"].includes(o.status) && <button className="btn-ghost" onClick={() => act(o, { status: "READY" })}>✅ Ready</button>}
                  {o.status === "READY" && o.type === "DELIVERY" && !["UBER", "PICKME"].includes(o.channel) && (
                    <select className="input w-auto" defaultValue="" onChange={(e) => e.target.value && act(o, { status: "OUT_FOR_DELIVERY", riderId: e.target.value })}>
                      <option value="">🛵 Send with…</option>
                      {riders.map((r) => (
                        <option key={r.id} value={r.id}>{r.name}</option>
                      ))}
                    </select>
                  )}
                  {["READY", "OUT_FOR_DELIVERY", "PREPARING", "CONFIRMED"].includes(o.status) && (o.paymentStatus === "PAID" || ["UBER", "PICKME"].includes(o.channel) || o.type === "DELIVERY") && (
                    <button className="btn-dark" onClick={() => act(o, { status: "COMPLETED" })}>Complete</button>
                  )}
                  {o.paymentStatus === "UNPAID" && o.status !== "PENDING" && !["UBER", "PICKME"].includes(o.channel) && <button className="btn-primary" onClick={() => setSettle(o)}>💵 Settle {money(o.total)}</button>}
                  <button className="btn-ghost" onClick={() => printer.printReceipt(o)}>🧾</button>
                  <button className="btn-ghost" onClick={() => printer.printKot(o)}>KOT</button>
                  {o.status !== "PENDING" && <button className="btn-ghost text-tomato" onClick={() => setCancel(o)}>Void</button>}
                </div>
              </div>
            ))}
          </div>
        </aside>
      </div>
      {settle && (
        <PayModal
          title={`Settle #${1000 + settle.number}`}
          total={settle.total}
          onClose={() => setSettle(null)}
          onPay={async (p) => {
            await onSettle(settle, p);
            setSettle(null);
          }}
        />
      )}
      {cancel && <CancelModal order={cancel} isManager={isManager} onClose={() => setCancel(null)} onConfirm={(reason, pin) => act(cancel, { status: "CANCELLED", reason, approvalPin: pin }, () => { setCancel(null); toast("Order cancelled — stock returned"); })} />}
    </>
  );
}

function CancelModal({ order, isManager, onClose, onConfirm }: { order: Ticket; isManager: boolean; onClose: () => void; onConfirm: (reason: string, pin?: string) => void }) {
  const [reason, setReason] = useState("");
  const [pin, setPin] = useState("");
  const needPin = !isManager && order.status !== "PENDING";
  return (
    <Modal open onClose={onClose} title={order.status === "PENDING" ? `Reject #${1000 + order.number}` : `Void #${1000 + order.number}`}>
      <div className="mb-3 flex flex-wrap gap-2">
        {["Out of stock", "Too busy", "Customer cancelled", "Wrong order", "Outside delivery area"].map((r) => (
          <button key={r} onClick={() => setReason(r)} className={`rounded-lg px-3 py-1.5 text-sm font-bold ${reason === r ? "bg-char text-cream" : "bg-char-50"}`}>{r}</button>
        ))}
      </div>
      <input className="input" placeholder="Reason" value={reason} onChange={(e) => setReason(e.target.value)} />
      {needPin && (
        <div className="mt-3">
          <p className="label">Manager PIN</p>
          <Keypad value={pin} onChange={setPin} masked max={6} />
        </div>
      )}
      <button disabled={!reason || (needPin && pin.length < 4)} onClick={() => onConfirm(reason, pin || undefined)} className="btn-primary mt-4 w-full">Confirm</button>
    </Modal>
  );
}
