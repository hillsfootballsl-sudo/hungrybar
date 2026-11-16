"use client";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Modal } from "@/components/staff/ui";
import { createPurchase } from "@/lib/actions/admin";

type Ing = { id: string; name: string; unit: string; costPerUnit: number; supplierId: string | null };

export function PurchaseForm({ ingredients, suppliers }: { ingredients: Ing[]; suppliers: { id: string; name: string }[] }) {
  const [open, setOpen] = useState(false);
  const [supplierId, setSupplierId] = useState("");
  const [invoiceNo, setInvoiceNo] = useState("");
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [paid, setPaid] = useState(true);
  const [updateCost, setUpdateCost] = useState(true);
  const [items, setItems] = useState<{ ingredientId: string; quantity: string; total: string }[]>([{ ingredientId: "", quantity: "", total: "" }]);
  const [err, setErr] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const router = useRouter();
  const list = supplierId ? [...ingredients].sort((a, b) => Number(b.supplierId === supplierId) - Number(a.supplierId === supplierId)) : ingredients;
  const sum = items.reduce((s, i) => s + (Number(i.total) || 0), 0);
  const set = (k: number, patch: Partial<(typeof items)[number]>) => setItems((it) => it.map((x, i) => (i === k ? { ...x, ...patch } : x)));

  return (
    <>
      <button className="btn-primary" onClick={() => setOpen(true)}>+ Record purchase</button>
      <Modal open={open} onClose={() => setOpen(false)} title="Record a purchase (stock in)" wide>
        <div className="grid gap-3 md:grid-cols-4">
          <label><span className="label">Supplier</span>
            <select className="input" value={supplierId} onChange={(e) => setSupplierId(e.target.value)}>
              <option value="">— none —</option>
              {suppliers.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </label>
          <label><span className="label">Invoice #</span><input className="input" value={invoiceNo} onChange={(e) => setInvoiceNo(e.target.value)} /></label>
          <label><span className="label">Date</span><input className="input" type="date" value={date} onChange={(e) => setDate(e.target.value)} /></label>
          <div className="flex flex-col justify-end gap-1 text-sm">
            <label className="flex items-center gap-2"><input type="checkbox" checked={paid} onChange={(e) => setPaid(e.target.checked)} className="accent-tomato" /> Paid</label>
            <label className="flex items-center gap-2"><input type="checkbox" checked={updateCost} onChange={(e) => setUpdateCost(e.target.checked)} className="accent-tomato" /> Update cost price</label>
          </div>
        </div>
        <table className="mt-4 w-full text-sm">
          <thead><tr className="text-left text-xs uppercase text-char-400"><th>Ingredient</th><th>Quantity</th><th>Total paid (Rs)</th><th>Unit cost</th><th /></tr></thead>
          <tbody>
            {items.map((it, k) => {
              const ing = ingredients.find((i) => i.id === it.ingredientId);
              const unit = Number(it.total) && Number(it.quantity) ? Number(it.total) / Number(it.quantity) : null;
              return (
                <tr key={k}>
                  <td className="py-1 pr-2">
                    <select className="input" value={it.ingredientId} onChange={(e) => set(k, { ingredientId: e.target.value })}>
                      <option value="">Choose…</option>
                      {list.map((i) => <option key={i.id} value={i.id}>{i.name} ({i.unit})</option>)}
                    </select>
                  </td>
                  <td className="py-1 pr-2"><input className="input" type="number" step="any" placeholder={ing ? ing.unit : ""} value={it.quantity} onChange={(e) => set(k, { quantity: e.target.value })} /></td>
                  <td className="py-1 pr-2"><input className="input" type="number" step="any" value={it.total} onChange={(e) => set(k, { total: e.target.value })} /></td>
                  <td className={`py-1 pr-2 text-xs ${unit && ing && unit > ing.costPerUnit * 1.15 ? "font-bold text-tomato" : "text-char-500"}`}>
                    {unit ? `${unit.toFixed(3)}/${ing?.unit}` : ""}
                    {unit && ing ? <span className="block">was {ing.costPerUnit}</span> : null}
                  </td>
                  <td><button className="text-tomato" onClick={() => setItems((x) => x.filter((_, i) => i !== k))}>✕</button></td>
                </tr>
              );
            })}
          </tbody>
        </table>
        <button className="btn-ghost btn-sm mt-2" onClick={() => setItems((x) => [...x, { ingredientId: "", quantity: "", total: "" }])}>+ Line</button>
        <p className="mt-2 text-xs text-char-400">Tip: buying 5 kg cheese for Rs 16,000 → quantity 5000 (g), total 16000. Cost per gram updates by weighted average.</p>
        {err && <p className="mt-3 rounded-lg bg-tomato-50 p-2 text-sm font-bold text-tomato-700">{err}</p>}
        <div className="mt-4 flex items-center justify-between">
          <p className="font-bold">Total: Rs. {sum.toLocaleString()}</p>
          <button
            className="btn-primary"
            disabled={pending}
            onClick={() =>
              start(async () => {
                setErr(null);
                const r = await createPurchase({ supplierId, invoiceNo, date, paid, updateCost, items: items.filter((i) => i.ingredientId).map((i) => ({ ingredientId: i.ingredientId, quantity: Number(i.quantity), total: Number(i.total) })) });
                if (!r.ok) return setErr(r.error);
                setOpen(false);
                setItems([{ ingredientId: "", quantity: "", total: "" }]);
                router.refresh();
              })
            }
          >
            {pending ? "Saving…" : "Save & add to stock"}
          </button>
        </div>
      </Modal>
    </>
  );
}
