"use client";
import { useState } from "react";
import { Keypad, Modal } from "@/components/staff/ui";
import { money } from "@/lib/pricing";

export function PayModal({ total, onClose, onPay, title = "Take payment" }: { total: number; onClose: () => void; onPay: (p: { method: "CASH" | "CARD"; tendered?: number | null }) => Promise<boolean | void>; title?: string }) {
  const [method, setMethod] = useState<"CASH" | "CARD">("CASH");
  const [cash, setCash] = useState("");
  const [busy, setBusy] = useState(false);
  const tendered = Number(cash) || 0;
  const change = tendered - total;
  const quick = Array.from(new Set([Math.ceil(total / 100) * 100, Math.ceil(total / 500) * 500, Math.ceil(total / 1000) * 1000, 5000])).filter((x) => x >= total).slice(0, 4);
  const go = async () => {
    setBusy(true);
    await onPay(method === "CASH" ? { method, tendered: tendered || total } : { method });
    setBusy(false);
  };
  return (
    <Modal open onClose={onClose} title={title}>
      <p className="text-center text-sm uppercase tracking-widest text-char-400">Amount due</p>
      <p className="text-center font-display text-5xl text-tomato">{money(total)}</p>
      <div className="my-4 grid grid-cols-2 gap-2">
        {(["CASH", "CARD"] as const).map((m) => (
          <button key={m} onClick={() => setMethod(m)} className={`rounded-xl py-3 text-lg font-bold ${method === m ? "bg-char text-cream" : "bg-char-50"}`}>
            {m === "CASH" ? "💵 Cash" : "💳 Card machine"}
          </button>
        ))}
      </div>
      {method === "CASH" ? (
        <>
          <div className="mb-3 grid grid-cols-4 gap-2">
            {quick.map((q) => (
              <button key={q} onClick={() => setCash(String(q))} className="rounded-lg bg-cream-200 py-2 font-bold">{q.toLocaleString()}</button>
            ))}
          </div>
          <Keypad value={cash} onChange={setCash} />
          <p className={`mt-3 rounded-xl p-3 text-center font-display text-2xl ${change >= 0 ? "bg-basil/15 text-basil" : "bg-char-50 text-char-400"}`}>
            {cash ? (change >= 0 ? `Change ${money(change)}` : `Short ${money(-change)}`) : "Exact cash"}
          </p>
        </>
      ) : (
        <p className="rounded-xl bg-cream-100 p-4 text-center">Charge <b>{money(total)}</b> on the card machine, then confirm.</p>
      )}
      <button disabled={busy || (method === "CASH" && !!cash && change < 0)} onClick={go} className="btn-primary mt-4 h-14 w-full text-lg">
        {busy ? "Saving…" : "Complete payment"}
      </button>
    </Modal>
  );
}
