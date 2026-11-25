"use client";
import { useEffect, useMemo, useState } from "react";
import { PizzaArt, ToppingIcon } from "@/components/PizzaArt";
import { money, priceLine } from "@/lib/pricing";
import type { CartLine, Catalog, CatTopping } from "@/lib/types";
import { useStore } from "./StoreProvider";
import { Icon, Sheet, Stepper, VegMark } from "./ui";

const WORD = ["None", "Regular", "Extra", "Triple", "Quad", "Max"];
export const portionWord = (t: CatTopping, n: number) => (t.unitLabel === "scoop" ? (n === 0 ? "None" : `${n} scoop${n > 1 ? "s" : ""}`) : WORD[n] ?? `${n}×`);

export function ToppingRow({ t, sizeId, value, included, onChange }: { t: CatTopping; sizeId: string; value: number; included: number; onChange: (n: number) => void }) {
  const ts = t.sizes[sizeId];
  const extraNote = included > 0 && value <= included ? "Included" : ts ? `+${money(ts.price)} each` : "";
  return (
    <div className="flex items-center gap-3 py-3">
      <div className={`grid h-11 w-11 shrink-0 place-items-center rounded-xl ${value > 0 ? "bg-cream-200" : "bg-char-50"}`}>
        <ToppingIcon visual={t.visual} className="h-8 w-8" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[15px] font-bold leading-tight">{t.name}</p>
        <p className={`text-xs font-bold ${extraNote === "Included" ? "text-basil" : "text-char-400"}`}>{extraNote.replace(" each", "")}{ts ? ` · ${ts.grams}g` : ""}</p>
      </div>
      <Stepper dark={value > 0} value={value} min={0} max={t.maxPortions} onChange={onChange} label={portionWord(t, value)} />
    </div>
  );
}

function allergens(catalog: Catalog, toppings: Record<string, number>) {
  const list = ["Wheat"];
  if (catalog.toppings.some((t) => t.visual === "cheese" && (toppings[t.id] ?? 0) > 0)) list.push("Milk");
  return list;
}

export function CustomiseModal() {
  const s = useStore();
  const c = s.customise;
  const cat = s.catalog;
  const editing = c?.editKey ? s.lines.find((l) => l.key === c.editKey) : undefined;
  const src = editing ?? c?.line;
  const product = cat.products.find((p) => p.id === (src?.productId ?? c?.productId) && p.kind === "PIZZA") ?? null;
  const sizes = useMemo(() => (product ? cat.sizes.filter((sz) => product.variants.some((v) => v.sizeId === sz.id)) : cat.sizes.filter((sz) => sz.inBuilder && sz.shape !== "RECT")), [product, cat.sizes]);
  const sauce = cat.toppings.find((t) => t.group === "SAUCE");
  const cheese = cat.toppings.find((t) => t.group === "CHEESE");

  const [sizeId, setSizeId] = useState<string>("");
  const [crustId, setCrustId] = useState<string>("");
  const [toppings, setToppings] = useState<Record<string, number>>({});
  const [qty, setQty] = useState(1);
  const [note, setNote] = useState("");
  const [view, setView] = useState<"photo" | "live">("live");
  const [open, setOpen] = useState<"size" | "crust" | null>(null);
  const [acc, setAcc] = useState<"included" | "more" | null>("included");

  useEffect(() => {
    if (!c) return;
    setSizeId(src?.sizeId ?? c.sizeId ?? sizes[sizes.length > 1 ? 1 : 0]?.id ?? sizes[0]?.id ?? "");
    setCrustId(src?.crustId ?? cat.crusts[0]?.id ?? "");
    setToppings(src?.toppings ?? (product ? { ...product.toppings } : { ...(sauce ? { [sauce.id]: 1 } : {}), ...(cheese ? { [cheese.id]: 1 } : {}) }));
    setQty(src?.quantity ?? 1);
    setNote(src?.note ?? "");
    setView(product?.image ? "photo" : "live");
    setOpen(null);
    setAcc("included");
  }, [c]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!c) return null;
  const size = cat.sizes.find((x) => x.id === sizeId);
  const isRect = size?.shape === "RECT";
  const preset = product?.toppings ?? {};
  const included = cat.toppings.filter((t) => (product ? (preset[t.id] ?? 0) > 0 : t.group === "SAUCE" || t.group === "CHEESE"));
  const more = cat.toppings.filter((t) => !included.includes(t));
  const line: Omit<CartLine, "key"> = { kind: "PIZZA", productId: product?.id, sizeId, crustId: isRect ? cat.crusts[0]?.id : crustId, toppings: Object.fromEntries(Object.entries(toppings).filter(([, n]) => n > 0)), quantity: qty, note: note.trim() || undefined };
  const priced = priceLine(cat, { ...line, key: "x" });
  const setT = (t: CatTopping, n: number) => {
    setToppings((x) => ({ ...x, [t.id]: Math.max(0, Math.min(t.maxPortions, n)) }));
    setView("live");
  };
  const sizePrice = (id: string) => (product ? product.variants.find((v) => v.sizeId === id)?.price : cat.sizes.find((x) => x.id === id)?.basePrice);
  const confirm = () =>
    s.requireMode(() => {
      if (editing) s.replace(editing.key, line);
      else s.add(line);
      s.openCustomise(null);
    });

  const visual = (
    <div className="relative h-[40dvh] w-full overflow-hidden md:h-[44dvh] bg-[radial-gradient(circle_at_50%_40%,#4a4a4a,#1c1c1c)] lg:aspect-square lg:h-auto lg:rounded-br-[40px]">
      {view === "photo" && product?.image ? (
        <img src={product.image} alt={product.name} className="h-full w-full object-cover" />
      ) : (
        <div className="grid h-full w-full place-items-center">
          <PizzaArt catalog={cat} sizeId={sizeId} crustId={isRect ? undefined : crustId} toppings={toppings} className="h-[92%] w-[92%]" />
        </div>
      )}
      {product?.image && (
        <div className="absolute left-3 top-3 flex rounded-full bg-white/90 p-1 text-xs font-bold shadow">
          {(["photo", "live"] as const).map((v) => (
            <button key={v} onClick={() => setView(v)} className={`rounded-full px-3 py-1.5 ${view === v ? "bg-char text-white" : ""}`}>{v === "photo" ? "Photo" : "Live preview"}</button>
          ))}
        </div>
      )}
      {view === "live" && <span className="absolute bottom-3 left-3 rounded-full bg-tomato px-3 py-1 text-xs font-bold text-white">Live preview · updates as you choose</span>}
    </div>
  );

  return (
    <Sheet open={!!c} onClose={() => s.openCustomise(null)} wide flush label="Customise your pizza">
      <div className="flex max-h-[94dvh] flex-col overflow-y-auto lg:grid lg:max-h-[86vh] lg:grid-cols-[1fr_1.05fr] lg:overflow-hidden">
        {/* left: picture + info */}
        <div className="bg-[#F7F5F1] lg:max-h-[86vh] lg:overflow-y-auto">
          {visual}
          <div className="p-5 md:p-7">
            <div className="flex items-start justify-between gap-3">
              <h2 className="text-2xl font-extrabold uppercase leading-tight md:text-3xl">{product?.name ?? "Build Your Own"}</h2>
              <VegMark veg={product ? product.isVeg : !cat.toppings.some((t) => t.group === "MEAT" && (toppings[t.id] ?? 0) > 0)} />
            </div>
            <p className="mt-2 text-char-500">{product?.description ?? "Start with our home-made sauce and mozzarella, then make it yours."}</p>
            <div className="mt-5 flex items-end justify-between gap-3">
              <div>
                <p className="font-bold">Allergens</p>
                <p className="mt-1 max-w-xs text-xs text-char-400">Made in a kitchen that handles wheat, milk, soy and egg. Customising may change allergens.</p>
              </div>
              <div className="flex gap-2">
                {allergens(cat, toppings).map((a) => (
                  <span key={a} className="flex flex-col items-center gap-1 text-xs font-bold">
                    <span className="grid h-9 w-9 place-items-center rounded-full bg-char text-white">{a === "Milk" ? "🥛" : "🌾"}</span>
                    {a}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* right: options */}
        <div className="flex flex-col bg-white lg:min-h-0">
          <div className="flex-1 p-5 pt-6 lg:max-h-[calc(86vh-88px)] lg:overflow-y-auto md:p-7">
            <h3 className="pr-10 text-2xl font-extrabold">Customise Your Style</h3>
            {/* size */}
            <div className="mt-4 rounded-2xl border border-char-100">
              <button onClick={() => setOpen(open === "size" ? null : "size")} className="flex w-full items-center justify-between px-4 py-3.5">
                <span className="font-bold">Size <span className="text-char-300">|</span> {size?.name ?? "Choose"}</span>
                <span className="text-sm font-bold text-tomato underline">{open === "size" ? "Done" : "Change"}</span>
              </button>
              {open === "size" && (
                <div className="grid grid-cols-1 gap-2 border-t border-char-100 p-3 sm:grid-cols-2">
                  {sizes.map((sz) => (
                    <button key={sz.id} onClick={() => { setSizeId(sz.id); setOpen(null); }} className={`flex items-center justify-between rounded-xl border px-3 py-2.5 text-left ${sz.id === sizeId ? "border-char bg-char text-white" : "border-char-100"}`}>
                      <span>
                        <span className="block font-bold">{sz.name}</span>
                        <span className="text-xs opacity-70">{sz.shape === "RECT" ? "Square deep-pan" : `Serves ${sz.persons}`}</span>
                      </span>
                      <span className="text-sm font-bold">{money(sizePrice(sz.id) ?? 0)}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
            {/* crust */}
            {!isRect && cat.crusts.length > 1 && (
              <div className="mt-3 rounded-2xl border border-char-100">
                <button onClick={() => setOpen(open === "crust" ? null : "crust")} className="flex w-full items-center justify-between px-4 py-3.5">
                  <span className="font-bold">Crust <span className="text-char-300">|</span> {cat.crusts.find((x) => x.id === crustId)?.name}</span>
                  <span className="text-sm font-bold text-tomato underline">{open === "crust" ? "Done" : "Change"}</span>
                </button>
                {open === "crust" && (
                  <div className="grid gap-2 border-t border-char-100 p-3">
                    {cat.crusts.map((cr) => (
                      <button key={cr.id} onClick={() => { setCrustId(cr.id); setOpen(null); setView("live"); }} className={`rounded-xl border px-3 py-2.5 text-left ${cr.id === crustId ? "border-char bg-char text-white" : "border-char-100"}`}>
                        <span className="block font-bold">{cr.name}</span>
                        <span className="text-xs opacity-70">{cr.description} · {cr.extraPrice ? `+${money(cr.extraPrice)}` : "no extra charge"}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
            {/* toppings */}
            <div className="mt-3 rounded-2xl border border-char-100 p-4">
              <p className="font-bold">Toppings <span className="font-normal text-char-500">· Top it off with your favourites!</span></p>
              {(
                [
                  ["included", product ? "Included toppings" : "Sauce & cheese", included],
                  ["more", "Add more toppings", more],
                ] as const
              ).map(([k, title, list]) => (
                <div key={k} className="mt-3 rounded-xl border border-char-100">
                  <button onClick={() => setAcc(acc === k ? null : k)} className="flex w-full items-center justify-between px-4 py-3 font-bold">
                    {title}
                    <Icon name="down" className={`h-5 w-5 transition ${acc === k ? "rotate-180" : ""}`} />
                  </button>
                  {acc === k && sizeId && (
                    <div className="divide-y divide-char-50 border-t border-char-100 px-3">
                      {list.map((t) => (
                        <ToppingRow key={t.id} t={t} sizeId={sizeId} value={toppings[t.id] ?? 0} included={preset[t.id] ?? 0} onChange={(n) => setT(t, n)} />
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
            <div className="mt-3">
              <label className="label" htmlFor="pz-note">Note for the kitchen</label>
              <input id="pz-note" className="input" maxLength={200} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Well done, cut in 8, extra crispy…" />
            </div>
            {priced.summary && <p className="mt-3 rounded-xl bg-cream-100 px-3 py-2 text-sm"><b>Your changes:</b> {priced.summary}</p>}
          </div>
          <div className="sticky bottom-0 z-10 flex items-center gap-3 border-t border-char-100 bg-white p-4 md:px-7">
            <Stepper value={qty} min={1} max={20} onChange={setQty} />
            <button disabled={!priced.valid} onClick={confirm} className="btn-primary h-14 min-w-0 flex-1 whitespace-nowrap px-4 text-base sm:text-lg">
              {editing ? "Update" : "Add To Cart"} {money(priced.unitPrice * qty)}
            </button>
          </div>
        </div>
      </div>
    </Sheet>
  );
}
