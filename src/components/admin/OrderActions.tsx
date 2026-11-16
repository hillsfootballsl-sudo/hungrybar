"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { type PrintConfig, usePrinter } from "@/components/staff/printing";
import { useToasts } from "@/components/staff/ui";
import type { Ticket } from "@/lib/orderView";

export function OrderActions({ ticket, print }: { ticket: Ticket; print: PrintConfig }) {
  const router = useRouter();
  const { toast, view } = useToasts();
  const printer = usePrinter(print, toast);
  const [reason, setReason] = useState("");
  const act = async (body: Record<string, unknown>) => {
    const r = await fetch(`/api/staff/orders/${ticket.id}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const j = await r.json();
    if (!r.ok) return toast(j.error, true);
    toast("Updated");
    router.refresh();
  };
  const next: Record<string, string[]> = {
    PENDING: ["CONFIRMED"],
    CONFIRMED: ["PREPARING", "READY", "COMPLETED"],
    PREPARING: ["READY", "COMPLETED"],
    READY: ["COMPLETED"],
    OUT_FOR_DELIVERY: ["COMPLETED"],
  };
  return (
    <div className="card space-y-3 p-4">
      {view}
      <p className="font-bold">Actions</p>
      <div className="flex flex-wrap gap-2">
        {(next[ticket.status] ?? []).map((s) => (
          <button key={s} className="btn-dark btn-sm" onClick={() => act({ status: s })}>→ {s.replaceAll("_", " ")}</button>
        ))}
        {ticket.paymentStatus === "UNPAID" && ticket.status !== "CANCELLED" && (
          <>
            <button className="btn-primary btn-sm" onClick={() => act({ pay: { method: "CASH" } })}>Mark paid (cash)</button>
            <button className="btn-ghost btn-sm" onClick={() => act({ pay: { method: "CARD" } })}>Mark paid (card)</button>
          </>
        )}
        <button className="btn-ghost btn-sm" onClick={() => printer.printReceipt(ticket)}>🧾 Print receipt</button>
        <button className="btn-ghost btn-sm" onClick={() => printer.printKot(ticket)}>Kitchen ticket</button>
      </div>
      {ticket.status !== "CANCELLED" && (
        <div className="flex gap-2 border-t border-char-100 pt-3">
          <input className="input" placeholder="Cancel reason" value={reason} onChange={(e) => setReason(e.target.value)} />
          <button disabled={!reason} className="btn-ghost btn-sm text-tomato" onClick={() => confirm("Cancel this order? Stock will be returned.") && act({ status: "CANCELLED", reason })}>Cancel order</button>
        </div>
      )}
      <p className="text-xs text-char-400">Printing here uses the browser print dialog unless a printer is connected on this device.</p>
    </div>
  );
}
