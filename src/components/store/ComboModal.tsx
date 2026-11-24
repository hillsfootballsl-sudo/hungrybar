"use client";
import { useEffect, useState } from "react";
import { ItemArt } from "@/components/ItemArt";
import { PizzaArt } from "@/components/PizzaArt";
import { money, priceLine } from "@/lib/pricing";
import type { CartLine, Catalog, ComboPick } from "@/lib/types";
import { ToppingRow } from "./CustomiseModal";
import { useStore } from "./StoreProvider";
import { ComboArt, Icon, Sheet, Stepper } from "./ui";

/** Reusable combo chooser (website + POS) */
export function ComboPicker({ catalog: cat, open, productId, initial, onClose, onConfirm, confirmLabel }: { catalog: Catalog; open: boolean; productId?: string; initial?: CartLine; onClose: () => void; onConfirm: (line: Omit<CartLine, "key">) => void; confirmLabel: string }) {
  const combo = cat.products.find((p) => p.id === productId && p.kind === "COMBO");
  const [picks, setPicks] = useState<ComboPick[]>([]);
  const [qty, setQty] = useState(1);
  const [edit, setEdit] = useState<number | null>(null);

  useEffect(() => {
    if (!combo) return;
    const src = initial;
    if (src?.picks) setPicks(src.picks);
    else {
      // preselect the first (cheapest) option for every unit
      const pre: ComboPick[] = [];
      for (const slot of combo.slots)
        for (let i = 0; i < slot.quantity; i++) {
          const o = slot.options[0];
          const p = cat.products.find((x) => x.id === o?.productId);
          if (o && p) pre.push({ slotId: slot.id, productId: o.productId, ...(p.kind === "PIZZA" ? { sizeId: o.sizeId ?? p.variants[0]?.sizeId ?? undefined, crustId: cat.crusts[0]?.id, toppings: { ...p.toppings } } : { variantId: o.variantId ?? p.variants[0]?.id }) });
        }
      setPicks(pre);
    }
    setQty(src?.quantity ?? 1);
    setEdit(null);
  }, [open, productId]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!open || !combo) return null;
  const line: Omit<CartLine, "key"> = { kind: "COMBO", productId: combo.id, picks, quantity: qty };
  const priced = priceLine(cat, { ...line, key: "x" });
  const setPick = (idx: number, p: ComboPick) => setPicks((ps) => ps.map((x, i) => (i === idx ? p : x)));

  let idx = 0;
  return (
    <Sheet open={open} onClose={onClose} wide flush label={`Choose items for ${combo.name}`}>
      <div className="flex max-h-[94dvh] flex-col overflow-y-auto md:grid md:max-h-[86vh] md:grid-cols-[0.9fr_1.1fr] md:overflow-hidden">
        <div className="bg-[#F7F5F1] md:overflow-y-auto">
          <div className="h-[30dvh] md:aspect-square md:h-auto">
            <ComboArt product={combo} catalog={cat} />
          </div>
          <div className="p-5 md:p-7">
            <p className="text-xs font-bold uppercase tracking-widest text-tomato">Hungry Deal</p>
            <h2 className="text-2xl font-extrabold uppercase md:text-3xl">{combo.name}</h2>
            <p className="mt-1 text-char-500">{combo.description}</p>
            <p className="mt-3 text-sm text-char-400">Deal price {money(combo.variants[0]?.price ?? 0)}. Some choices add a small top-up, shown next to them.</p>
          </div>
        </div>
        <div className="flex flex-col md:min-h-0">
          <div className="flex-1 space-y-5 p-5 pt-6 md:max-h-[calc(86vh-88px)] md:overflow-y-auto md:p-7">
            <h3 className="pr-10 text-2xl font-extrabold">Pick your items</h3>
            {combo.slots.map((slot) => (
              <div key={slot.id} className="rounded-2xl border border-char-100 p-4">
                <p className="font-bold">{slot.label}{slot.quantity > 1 ? ` · choose ${slot.quantity}` : ""}</p>
                {Array.from({ length: slot.quantity }, () => idx++).map((pi, unit) => {
                  const pick = picks[pi];
                  if (!pick) return null;
                  const prod = cat.products.find((p) => p.id === pick.productId);
                  return (
                    <div key={pi} className="mt-3">
                      {slot.quantity > 1 && <p className="mb-1 text-xs font-bold uppercase tracking-wider text-char-400">#{unit + 1}</p>}
                      <div className="no-scrollbar -mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
                        {slot.options.map((o) => {
                          const p = cat.products.find((x) => x.id === o.productId);
                          if (!p) return null;
                          const active = pick.productId === o.productId;
                          return (
                            <button
                              key={o.productId + (o.sizeId ?? o.variantId ?? "")}
                              onClick={() => setPick(pi, { slotId: slot.id, productId: p.id, ...(p.kind === "PIZZA" ? { sizeId: o.sizeId ?? p.variants[0]?.sizeId ?? undefined, crustId: cat.crusts[0]?.id, toppings: { ...p.toppings } } : { variantId: o.variantId ?? p.variants[0]?.id }) })}
                              className={`flex w-28 shrink-0 flex-col items-center rounded-2xl border p-2 text-center transition ${active ? "border-char bg-char text-white" : "border-char-100 hover:border-char-300"}`}
                            >
                              <span className="grid h-16 w-16 place-items-center overflow-hidden rounded-xl bg-white">
                                {p.image ? <img src={p.image} alt="" className="h-full w-full object-cover" /> : p.kind === "PIZZA" ? <PizzaArt catalog={cat} sizeId={o.sizeId ?? undefined} toppings={p.toppings} board={false} animate={false} scaleBySize={false} className="h-16 w-16" /> : <ItemArt art={p.art} className="h-12 w-12" />}
                              </span>
                              <span className="mt-1 line-clamp-2 text-xs font-bold leading-tight">{p.name}</span>
                              <span className={`text-[11px] font-bold ${active ? "text-mustard" : "text-char-400"}`}>{o.upcharge ? `+${money(o.upcharge)}` : "Included"}</span>
                            </button>
                          );
                        })}
                      </div>
                      {prod?.kind === "PIZZA" && pick.sizeId && (
                        <div className="mt-2">
                          <button onClick={() => setEdit(edit === pi ? null : pi)} className="text-sm font-bold text-tomato underline">{edit === pi ? "Done customising" : "Customise this pizza"}</button>
                          {edit === pi && (
                            <div className="mt-2 rounded-xl bg-char-50 p-3">
                              {cat.sizes.find((x) => x.id === pick.sizeId)?.shape !== "RECT" && (
                                <div className="mb-2 flex gap-2">
                                  {cat.crusts.map((cr) => (
                                    <button key={cr.id} onClick={() => setPick(pi, { ...pick, crustId: cr.id })} className={`rounded-full px-3 py-1.5 text-xs font-bold ${pick.crustId === cr.id ? "bg-char text-white" : "bg-white"}`}>{cr.name}</button>
                                  ))}
                                </div>
                              )}
                              <div className="divide-y divide-char-100">
                                {cat.toppings.map((t) => (
                                  <ToppingRow key={t.id} t={t} sizeId={pick.sizeId!} value={(pick.toppings ?? prod.toppings)[t.id] ?? 0} included={prod.toppings[t.id] ?? 0} onChange={(n) => setPick(pi, { ...pick, toppings: { ...(pick.toppings ?? prod.toppings), [t.id]: Math.max(0, Math.min(t.maxPortions, n)) } })} />
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ))}
            {!priced.valid && <p className="flex items-center gap-2 text-sm font-bold text-tomato"><Icon name="info" className="h-4 w-4" />{priced.error}</p>}
          </div>
          <div className="sticky bottom-0 z-10 flex items-center gap-3 border-t border-char-100 bg-white p-4 md:px-7">
            <Stepper value={qty} min={1} max={10} onChange={setQty} />
            <button
              disabled={!priced.valid}
              onClick={() => onConfirm(line)}
              className="btn-primary h-14 flex-1 text-lg"
            >
              {confirmLabel} {money(priced.unitPrice * qty)}
            </button>
          </div>
        </div>
      </div>
    </Sheet>
  );
}

export function ComboModal() {
  const s = useStore();
  const c = s.combo;
  const editing = c?.editKey ? s.lines.find((l) => l.key === c.editKey) : undefined;
  return (
    <ComboPicker
      catalog={s.catalog}
      open={!!c}
      productId={c?.productId}
      initial={editing ?? c?.line}
      onClose={() => s.openCombo(null)}
      confirmLabel={editing ? "Update" : "Add To Cart"}
      onConfirm={(line) =>
        s.requireMode(() => {
          if (editing) s.replace(editing.key, line);
          else s.add(line);
          s.openCombo(null);
        })
      }
    />
  );
}
