"use client";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { ToppingIcon } from "@/components/PizzaArt";
import { saveTopping } from "@/lib/actions/admin";

type Size = { id: string; short: string; name: string };
type T = { id?: string; name: string; group: string; visual: string; ingredientId: string; maxPortions: number; unitLabel: string; isVeg: boolean; active: boolean; sortOrder: number; sizes: Record<string, { grams: number; price: number }> };

const VISUALS = ["sauce", "cheese", "chicken", "beef", "pepperoni", "pepper_green", "pepper_red", "capsicum", "onion", "paneer", "olive", "mushroom", "jalapeno", "corn"];

function Row({ t: init, sizes, ingredients }: { t: T; sizes: Size[]; ingredients: { id: string; name: string }[] }) {
  const [t, setT] = useState(init);
  const [dirty, setDirty] = useState(!init.id);
  const [msg, setMsg] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const router = useRouter();
  const up = (patch: Partial<T>) => {
    setT((x) => ({ ...x, ...patch }));
    setDirty(true);
  };
  const upSize = (sid: string, k: "grams" | "price", v: number) => up({ sizes: { ...t.sizes, [sid]: { grams: t.sizes[sid]?.grams ?? 0, price: t.sizes[sid]?.price ?? 0, [k]: v } } });
  return (
    <tr className={t.active ? "" : "opacity-50"}>
      <td className="min-w-[200px]">
        <div className="flex items-center gap-2">
          <ToppingIcon visual={t.visual} className="h-8 w-8 shrink-0" />
          <div className="space-y-1">
            <input className="input py-1" value={t.name} onChange={(e) => up({ name: e.target.value })} />
            <div className="flex gap-1">
              <select className="input py-1 text-xs" value={t.group} onChange={(e) => up({ group: e.target.value })}>{["SAUCE", "CHEESE", "MEAT", "VEG", "EXTRA"].map((g) => <option key={g}>{g}</option>)}</select>
              <select className="input py-1 text-xs" value={t.visual} onChange={(e) => up({ visual: e.target.value })}>{VISUALS.map((g) => <option key={g}>{g}</option>)}</select>
            </div>
          </div>
        </div>
      </td>
      <td>
        <select className="input py-1 text-xs" value={t.ingredientId} onChange={(e) => up({ ingredientId: e.target.value })}>
          <option value="">— none —</option>
          {ingredients.map((i) => <option key={i.id} value={i.id}>{i.name}</option>)}
        </select>
        <div className="mt-1 flex gap-1 text-xs">
          <input className="input w-14 py-1" type="number" min={1} max={6} value={t.maxPortions} title="Max portions" onChange={(e) => up({ maxPortions: Number(e.target.value) })} />
          <input className="input w-20 py-1" value={t.unitLabel} title="Unit label" onChange={(e) => up({ unitLabel: e.target.value })} />
        </div>
      </td>
      {sizes.map((s) => (
        <td key={s.id}>
          <div className="flex flex-col gap-1">
            <label className="flex items-center gap-1 text-xs"><input className="input w-16 py-1" type="number" step="any" value={t.sizes[s.id]?.grams ?? 0} onChange={(e) => upSize(s.id, "grams", Number(e.target.value))} />g</label>
            <label className="flex items-center gap-1 text-xs">Rs<input className="input w-16 py-1" type="number" value={t.sizes[s.id]?.price ?? 0} onChange={(e) => upSize(s.id, "price", Number(e.target.value))} /></label>
          </div>
        </td>
      ))}
      <td>
        <label className="flex items-center gap-1 text-xs"><input type="checkbox" checked={t.active} onChange={(e) => up({ active: e.target.checked })} /> on</label>
        <label className="flex items-center gap-1 text-xs"><input type="checkbox" checked={t.isVeg} onChange={(e) => up({ isVeg: e.target.checked })} /> veg</label>
      </td>
      <td>
        <button
          className={dirty ? "btn-primary btn-sm" : "btn-ghost btn-sm"}
          disabled={pending || !dirty}
          onClick={() =>
            start(async () => {
              const r = await saveTopping({ ...t, ingredientId: t.ingredientId || null, sizes: sizes.map((s) => ({ sizeId: s.id, grams: t.sizes[s.id]?.grams ?? 0, price: t.sizes[s.id]?.price ?? 0 })) });
              setMsg(r.ok ? "Saved" : r.error);
              if (r.ok) {
                setDirty(false);
                router.refresh();
              }
            })
          }
        >
          {pending ? "…" : "Save"}
        </button>
        {msg && <p className="text-xs text-char-400">{msg}</p>}
      </td>
    </tr>
  );
}

export function ToppingMatrix({ toppings, sizes, ingredients }: { toppings: T[]; sizes: Size[]; ingredients: { id: string; name: string }[] }) {
  const [extra, setExtra] = useState<T[]>([]);
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm [&_td]:px-2 [&_td]:py-2">
        <thead>
          <tr className="text-left text-xs uppercase text-char-400">
            <th className="px-2">Topping</th>
            <th className="px-2">Stock item · max · unit</th>
            {sizes.map((s) => <th key={s.id} className="px-2">{s.name}<span className="block font-normal normal-case">grams / price per portion</span></th>)}
            <th />
            <th />
          </tr>
        </thead>
        <tbody className="divide-y divide-char-50">
          {[...toppings, ...extra].map((t, i) => <Row key={t.id ?? `new${i}`} t={t} sizes={sizes} ingredients={ingredients} />)}
        </tbody>
      </table>
      <button className="btn-ghost btn-sm mt-2" onClick={() => setExtra((e) => [...e, { name: "New topping", group: "EXTRA", visual: "olive", ingredientId: "", maxPortions: 3, unitLabel: "portion", isVeg: true, active: true, sortOrder: 50, sizes: {} }])}>+ Topping</button>
    </div>
  );
}
