"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { PizzaArt, ToppingIcon } from "@/components/PizzaArt";
import { money, priceLine } from "@/lib/pricing";
import type { CartLine, Catalog, CatTopping, ToppingGroup } from "@/lib/types";

type StepId = "size" | "crust" | ToppingGroup | "review";

const STEP_META: Record<StepId, { title: string; hint: string }> = {
  size: { title: "Size", hint: "How hungry are we?" },
  crust: { title: "Base", hint: "Pick your crust" },
  SAUCE: { title: "Sauce", hint: "Our home-made tomato sauce — scoop it on" },
  CHEESE: { title: "Cheese", hint: "Mozzarella. Go on, add another." },
  MEAT: { title: "Meats", hint: "100% halal, cooked in-house" },
  VEG: { title: "Veggies", hint: "Fresh, crunchy, colourful" },
  EXTRA: { title: "Extras", hint: "Finishing touches" },
  review: { title: "Review", hint: "Looking delicious" },
};

const PORTION_WORD = ["None", "Regular", "Extra", "Triple", "Quad"];

export interface BuilderInitial {
  productId?: string | null;
  sizeId?: string | null;
  crustId?: string | null;
  toppings?: Record<string, number>;
  quantity?: number;
  note?: string;
}

export function PizzaBuilder({
  catalog,
  initial,
  onConfirm,
  confirmLabel = "Add to order",
  variant = "page",
}: {
  catalog: Catalog;
  initial?: BuilderInitial;
  onConfirm: (line: Omit<CartLine, "key">) => void;
  confirmLabel?: string;
  variant?: "page" | "embedded";
}) {
  const product = catalog.products.find((p) => p.id === initial?.productId && p.kind === "PIZZA") ?? null;
  const preset = product?.toppings ?? null;

  const sizesForThis = useMemo(
    () => (product ? catalog.sizes.filter((s) => product.variants.some((v) => v.sizeId === s.id)) : catalog.sizes.filter((s) => s.inBuilder)),
    [catalog.sizes, product],
  );

  const [sizeId, setSizeId] = useState<string | undefined>(initial?.sizeId ?? (product ? sizesForThis[0]?.id : undefined));
  const [crustId, setCrustId] = useState<string>(initial?.crustId ?? catalog.crusts[0]?.id);
  const [toppings, setToppings] = useState<Record<string, number>>(initial?.toppings ?? { ...(preset ?? {}) });
  const [qty, setQty] = useState(initial?.quantity ?? 1);
  const [note, setNote] = useState(initial?.note ?? "");
  const size = catalog.sizes.find((s) => s.id === sizeId);
  const isRect = size?.shape === "RECT";

  const groups = useMemo(() => {
    const g: Partial<Record<ToppingGroup, CatTopping[]>> = {};
    for (const t of catalog.toppings) (g[t.group] ??= []).push(t);
    return g;
  }, [catalog.toppings]);

  const steps: StepId[] = useMemo(() => {
    const s: StepId[] = ["size"];
    if (!isRect && catalog.crusts.length > 1) s.push("crust");
    (["SAUCE", "CHEESE", "MEAT", "VEG", "EXTRA"] as ToppingGroup[]).forEach((g) => groups[g]?.length && s.push(g));
    s.push("review");
    return s;
  }, [groups, isRect, catalog.crusts.length]);

  const [stepIdx, setStepIdx] = useState(initial?.sizeId && !product ? 1 : 0);
  const step = steps[Math.min(stepIdx, steps.length - 1)];

  const line: Omit<CartLine, "key"> = {
    kind: "PIZZA",
    productId: product?.id,
    sizeId,
    crustId: isRect ? catalog.crusts[0]?.id : crustId,
    toppings: Object.fromEntries(Object.entries(toppings).filter(([, n]) => n > 0)),
    quantity: qty,
    note: note.trim() || undefined,
  };
  const priced = priceLine(catalog, { ...line, key: "x", quantity: 1 });

  // price-change bubble
  const [delta, setDelta] = useState<{ v: number; k: number } | null>(null);
  const prev = useRef(priced.unitPrice);
  useEffect(() => {
    if (!sizeId) return;
    const d = priced.unitPrice - prev.current;
    prev.current = priced.unitPrice;
    if (Math.abs(d) >= 1) {
      setDelta({ v: d, k: Date.now() });
      const t = setTimeout(() => setDelta(null), 1100);
      return () => clearTimeout(t);
    }
  }, [priced.unitPrice, sizeId]);

  const setPortion = (t: CatTopping, n: number) => setToppings((s) => ({ ...s, [t.id]: Math.max(0, Math.min(t.maxPortions, n)) }));

  const totalPortions = Object.entries(toppings).reduce((s, [id, n]) => {
    const t = catalog.toppings.find((x) => x.id === id);
    return s + (t && t.group !== "SAUCE" ? n : 0);
  }, 0);
  const loaded = Math.min(1, totalPortions / 9);
  const loadedLabel = totalPortions === 0 ? "Naked" : totalPortions <= 2 ? "Classic" : totalPortions <= 4 ? "Tasty" : totalPortions <= 6 ? "Loaded" : "MONSTER";

  const surprise = () => {
    const s: Record<string, number> = {};
    const r = () => Math.random();
    for (const t of catalog.toppings) {
      if (t.group === "SAUCE") s[t.id] = 1 + (r() > 0.7 ? 1 : 0);
      else if (t.group === "CHEESE") s[t.id] = 1 + (r() > 0.5 ? 1 : 0);
      else if (t.group === "MEAT") s[t.id] = r() > 0.55 ? 1 : 0;
      else s[t.id] = r() > 0.5 ? 1 : 0;
    }
    if (!sizeId) setSizeId(sizesForThis[0]?.id);
    setToppings(s);
    setStepIdx(steps.length - 1);
  };

  const canNext = step !== "size" || !!sizeId;
  const next = () => canNext && setStepIdx((i) => Math.min(steps.length - 1, i + 1));
  const back = () => setStepIdx((i) => Math.max(0, i - 1));
  const page = variant === "page";

  const sizeVariantPrice = (sid: string) => (product ? product.variants.find((v) => v.sizeId === sid)?.price : catalog.sizes.find((s) => s.id === sid)?.basePrice);

  // ───────────── UI pieces ─────────────
  const Visual = (
    <div className="relative">
      <div className={`relative mx-auto aspect-square ${page ? "w-[min(78vw,330px)] lg:w-full lg:max-w-[520px]" : "w-[260px]"}`}>
        <div className="absolute inset-0 -z-0 rounded-full sunburst opacity-60" />
        <PizzaArt catalog={catalog} sizeId={sizeId} crustId={isRect ? undefined : crustId} toppings={toppings} sliced={step === "review"} steam={step === "review"} className="relative h-full w-full drop-shadow-xl" />
        {delta && (
          <span key={delta.k} className={`pointer-events-none absolute left-1/2 top-6 -translate-x-1/2 animate-[floaty_1.1s_ease-out] rounded-full border-2 border-char px-3 py-1 font-bold shadow-retro ${delta.v > 0 ? "bg-mustard text-char" : "bg-basil text-white"}`}>
            {delta.v > 0 ? "+" : "−"}
            {money(Math.abs(delta.v)).replace("Rs. ", "Rs.")}
          </span>
        )}
      </div>
    </div>
  );

  const PriceBox = (
    <div className="flex items-end justify-between gap-3">
      <div className="min-w-0">
        <p className="truncate font-condensed text-2xl uppercase leading-none tracking-wide lg:text-4xl">{product?.name ?? "Build Your Own"}</p>
        <p className="mt-1 truncate text-sm text-char-500">{sizeId ? [size?.name, isRect ? "Detroit pan" : catalog.crusts.find((c) => c.id === crustId)?.name].filter(Boolean).join(" · ") : "Start by picking a size"}</p>
      </div>
      <div className="text-right">
        <p className="text-[10px] font-bold uppercase tracking-widest text-char-400">Price</p>
        <p key={priced.unitPrice} className="animate-pop whitespace-nowrap font-display text-3xl leading-none text-tomato lg:text-4xl">{sizeId ? money(priced.unitPrice) : "—"}</p>
      </div>
    </div>
  );

  const Meter = (
    <div className="flex items-center gap-3">
      <span className="text-[10px] font-bold uppercase tracking-widest text-char-400">Loaded-o-meter</span>
      <div className="h-3 flex-1 overflow-hidden rounded-full border-2 border-char bg-white">
        <div className="h-full bg-gradient-to-r from-mustard via-tomato to-tomato-700 transition-all duration-500" style={{ width: `${Math.max(4, loaded * 100)}%` }} />
      </div>
      <span className="w-20 text-right font-condensed text-lg uppercase">{loadedLabel}</span>
    </div>
  );

  const StepPills = (
    <div className="no-scrollbar -mx-1 flex gap-2 overflow-x-auto px-1 py-1">
      {steps.map((s, i) => {
        const done = i < stepIdx;
        const active = i === stepIdx;
        const disabled = i > 0 && !sizeId;
        return (
          <button
            key={s}
            disabled={disabled}
            onClick={() => setStepIdx(i)}
            className={`flex shrink-0 items-center gap-2 rounded-full border-2 border-char px-3 py-1.5 text-sm font-bold transition disabled:opacity-40 ${
              active ? "bg-char text-cream" : done ? "bg-mustard" : "bg-white hover:bg-cream-200"
            }`}
          >
            <span className={`grid h-5 w-5 place-items-center rounded-full text-[11px] ${active ? "bg-tomato text-white" : done ? "bg-char text-cream" : "bg-cream-200"}`}>{done ? "✓" : i + 1}</span>
            {STEP_META[s].title}
          </button>
        );
      })}
    </div>
  );

  const ToppingCard = ({ t }: { t: CatTopping }) => {
    const n = toppings[t.id] ?? 0;
    const inc = preset?.[t.id] ?? 0;
    const ts = sizeId ? t.sizes[sizeId] : undefined;
    const priceNote = !ts ? "" : inc > 0 && n <= inc ? "Included" : `+${money(ts.price)}`;
    return (
      <div className={`relative flex flex-col rounded-2xl border-2 border-char p-3 transition ${n > 0 ? "bg-white shadow-retro" : "bg-cream-50"}`}>
        {inc > 0 && <span className="absolute -top-2.5 left-3 rounded-full border-2 border-char bg-mustard px-2 text-[10px] font-bold uppercase">In recipe</span>}
        <div className="flex items-center gap-3">
          <button onClick={() => setPortion(t, n > 0 ? 0 : 1)} className={`grid h-14 w-14 shrink-0 place-items-center rounded-xl border-2 border-char transition ${n > 0 ? "bg-cream-200" : "bg-white"}`} aria-label={`Toggle ${t.name}`}>
            <ToppingIcon visual={t.visual} className="h-10 w-10" />
          </button>
          <div className="min-w-0 flex-1">
            <p className="font-bold leading-tight">{t.name}</p>
            <p className="text-xs text-char-400">{ts ? `${ts.grams}g / ${t.unitLabel} · ` : ""}<span className={priceNote === "Included" ? "font-bold text-basil" : "font-bold text-tomato-700"}>{priceNote}</span></p>
          </div>
        </div>
        <div className="mt-3 flex items-center justify-between">
          <span className="text-xs font-bold uppercase tracking-wide text-char-500">
            {t.unitLabel === "scoop" ? `${n} scoop${n === 1 ? "" : "s"}` : PORTION_WORD[n] ?? `${n}×`}
            {inc > 0 && n === 0 ? " · removed" : ""}
          </span>
          <div className="flex items-center rounded-full border-2 border-char bg-white">
            <button className="h-9 w-9 text-xl font-bold disabled:opacity-30" disabled={n === 0} onClick={() => setPortion(t, n - 1)} aria-label={`Less ${t.name}`}>−</button>
            <div className="flex gap-1 px-1">
              {Array.from({ length: t.maxPortions }, (_, i) => (
                <span key={i} className={`h-2.5 w-2.5 rounded-full border border-char transition ${i < n ? "bg-tomato" : "bg-cream-200"}`} />
              ))}
            </div>
            <button className="h-9 w-9 text-xl font-bold disabled:opacity-30" disabled={n >= t.maxPortions} onClick={() => setPortion(t, n + 1)} aria-label={`More ${t.name}`}>+</button>
          </div>
        </div>
      </div>
    );
  };

  let body: React.ReactNode = null;
  if (step === "size") {
    body = (
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {sizesForThis.map((s, i) => {
          const price = sizeVariantPrice(s.id);
          const active = s.id === sizeId;
          const dim = s.shape === "RECT" ? null : 34 + i * 10;
          return (
            <button
              key={s.id}
              onClick={() => {
                setSizeId(s.id);
                setTimeout(() => setStepIdx(1), 350);
              }}
              className={`group flex flex-col items-center rounded-2xl border-2 border-char p-4 text-center transition hover:-translate-y-0.5 ${active ? "bg-char text-cream shadow-retro-red" : "bg-white shadow-retro"}`}
            >
              <div className="grid h-20 place-items-center">
                {s.shape === "RECT" ? (
                  <div className={`h-12 w-16 rounded-md border-[3px] ${active ? "border-tomato bg-mustard" : "border-char bg-mustard/70"}`} />
                ) : (
                  <div className={`rounded-full border-[3px] ${active ? "border-tomato bg-mustard" : "border-char bg-mustard/70"}`} style={{ width: dim!, height: dim! }} />
                )}
              </div>
              <p className="font-condensed text-2xl uppercase leading-none">{s.name}</p>
              <p className={`text-xs ${active ? "text-cream/70" : "text-char-400"}`}>{s.shape === "RECT" ? "Square deep-pan" : `Serves ${s.persons}`}</p>
              {price != null && <p className={`mt-2 font-bold ${active ? "text-tomato-300" : "text-tomato"}`}>{product ? money(price) : `from ${money(price)}`}</p>}
            </button>
          );
        })}
      </div>
    );
  } else if (step === "crust") {
    body = (
      <div className="grid gap-3 sm:grid-cols-2">
        {catalog.crusts.map((c) => {
          const active = c.id === crustId;
          const thin = /thin/i.test(c.name);
          return (
            <button key={c.id} onClick={() => setCrustId(c.id)} className={`flex items-center gap-4 rounded-2xl border-2 border-char p-4 text-left transition ${active ? "bg-char text-cream shadow-retro-red" : "bg-white shadow-retro hover:-translate-y-0.5"}`}>
              <svg viewBox="0 0 100 40" className="h-12 w-24 shrink-0">
                <path d={thin ? "M4 26 Q50 22 96 26 L96 30 Q50 26 4 30Z" : "M4 18 Q10 8 18 16 Q50 14 82 16 Q90 8 96 18 L96 32 Q50 28 4 32Z"} fill="#E9B66B" stroke="#262626" strokeWidth="2.5" />
                <path d={thin ? "M10 25 Q50 21 90 25" : "M18 17 Q50 13 82 17"} stroke="#C8321F" strokeWidth="3" fill="none" />
              </svg>
              <div>
                <p className="font-condensed text-2xl uppercase leading-none">{c.name}</p>
                <p className={`mt-1 text-sm ${active ? "text-cream/70" : "text-char-400"}`}>{c.description}</p>
                <p className={`mt-1 text-sm font-bold ${active ? "text-tomato-300" : "text-tomato"}`}>{c.extraPrice ? `+${money(c.extraPrice)}` : "No extra charge"}</p>
              </div>
            </button>
          );
        })}
      </div>
    );
  } else if (step === "review") {
    const chosen = catalog.toppings.filter((t) => (toppings[t.id] ?? 0) > 0);
    const removed = preset ? catalog.toppings.filter((t) => (preset[t.id] ?? 0) > 0 && !(toppings[t.id] ?? 0)) : [];
    body = (
      <div className="space-y-4">
        <div className="rounded-2xl border-2 border-dashed border-char/40 bg-white p-4">
          <p className="mb-2 text-xs font-bold uppercase tracking-widest text-char-400">What&apos;s on it</p>
          <div className="flex flex-wrap gap-2">
            {chosen.length === 0 && <span className="text-char-400">Just dough. Brave choice.</span>}
            {chosen.map((t) => (
              <span key={t.id} className="flex items-center gap-1.5 rounded-full border-2 border-char bg-cream-100 py-1 pl-1 pr-3 text-sm font-bold">
                <ToppingIcon visual={t.visual} className="h-6 w-6" />
                {toppings[t.id] > 1 ? `${toppings[t.id]}× ` : ""}
                {t.name}
              </span>
            ))}
            {removed.map((t) => (
              <span key={t.id} className="rounded-full border-2 border-dashed border-char/50 px-3 py-1 text-sm font-bold text-char-400 line-through">{t.name}</span>
            ))}
          </div>
        </div>
        <div>
          <label className="label" htmlFor="pizza-note">Kitchen note (optional)</label>
          <input id="pizza-note" className="input" maxLength={200} placeholder="e.g. well done, cut in 8, extra crispy" value={note} onChange={(e) => setNote(e.target.value)} />
        </div>
        <div className="flex items-center justify-between rounded-2xl border-2 border-char bg-white p-3">
          <span className="font-bold">How many?</span>
          <div className="flex items-center rounded-full border-2 border-char">
            <button className="h-10 w-10 text-xl font-bold" onClick={() => setQty((q) => Math.max(1, q - 1))} aria-label="Less">−</button>
            <span className="w-8 text-center text-lg font-bold">{qty}</span>
            <button className="h-10 w-10 text-xl font-bold" onClick={() => setQty((q) => Math.min(20, q + 1))} aria-label="More">+</button>
          </div>
        </div>
      </div>
    );
  } else {
    const list = groups[step as ToppingGroup] ?? [];
    body = (
      <div className="grid gap-3 sm:grid-cols-2">
        {list.map((t) => (
          <div key={t.id}>{ToppingCard({ t })}</div>
        ))}
      </div>
    );
  }

  const Actions = (
    <div className="flex items-center gap-3">
      {stepIdx > 0 && (
        <button onClick={back} className="btn-ghost px-4" aria-label="Back">
          ←
        </button>
      )}
      {step === "review" ? (
        <button disabled={!priced.valid || !sizeId} onClick={() => onConfirm(line)} className="btn-primary flex-1 text-lg">
          {confirmLabel} · {money(priced.unitPrice * qty)}
        </button>
      ) : (
        <button disabled={!canNext} onClick={next} className="btn-dark flex-1 text-lg">
          {step === "size" && !sizeId ? "Pick a size" : `Next: ${STEP_META[steps[stepIdx + 1]]?.title}`} →
        </button>
      )}
    </div>
  );

  if (!page) {
    // Embedded (POS modal): compact two-column layout
    return (
      <div className="grid grid-cols-[minmax(0,1fr)] gap-4 md:grid-cols-[300px_minmax(0,1fr)]">
        <div className="space-y-3">
          {Visual}
          {PriceBox}
          {Meter}
        </div>
        <div className="flex min-h-0 flex-col gap-3">
          {StepPills}
          <div className="min-h-[280px] flex-1">{body}</div>
          {Actions}
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 pb-44 lg:pb-16">
      <div className="grid grid-cols-[minmax(0,1fr)] gap-6 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)] lg:gap-10">
        {/* Visual column — sticky on every screen size */}
        <div className="sticky top-16 z-20 -mx-4 border-b-2 border-char bg-cream-100/95 px-4 pb-3 pt-3 backdrop-blur lg:top-24 lg:mx-0 lg:self-start lg:rounded-3xl lg:border-2 lg:bg-char lg:p-8 lg:text-cream lg:shadow-retro-lg">
          <div className="hidden lg:block">{Visual}</div>
          <div className="flex items-center gap-3 lg:hidden">
            <div className="h-36 w-36 shrink-0 sm:h-44 sm:w-44">
              <PizzaArt catalog={catalog} sizeId={sizeId} crustId={isRect ? undefined : crustId} toppings={toppings} className="h-full w-full" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="line-clamp-2 font-condensed text-2xl uppercase leading-none tracking-wide">{product?.name ?? "Build Your Own"}</p>
              <p className="mt-1 truncate text-xs text-char-500">{sizeId ? [size?.name, isRect ? "Detroit pan" : catalog.crusts.find((c) => c.id === crustId)?.name].filter(Boolean).join(" · ") : "Pick a size to start"}</p>
              <p key={priced.unitPrice} className="mt-2 animate-pop font-display text-3xl leading-none text-tomato">{sizeId ? money(priced.unitPrice) : "—"}</p>
            </div>
          </div>
          <div className="mt-6 hidden space-y-4 lg:block [&_.text-char-400]:text-cream/60 [&_.text-char-500]:text-cream/70">
            {PriceBox}
            {Meter}
          </div>
        </div>

        {/* Controls */}
        <div className="space-y-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-bold uppercase tracking-[.2em] text-tomato">Step {stepIdx + 1} of {steps.length}</p>
              <h1 className="h-display text-4xl md:text-5xl">{STEP_META[step].title}</h1>
              <p className="text-char-500">{STEP_META[step].hint}</p>
            </div>
            <div className="flex flex-col gap-2">
              <button onClick={surprise} className="btn-ghost btn-sm whitespace-nowrap">🎲 Surprise me</button>
              {stepIdx > 0 && (
                <button onClick={() => setToppings({ ...(preset ?? {}) })} className="text-xs font-bold text-char-400 underline">
                  Reset toppings
                </button>
              )}
            </div>
          </div>
          {StepPills}
          <div className="min-h-[300px]">{body}</div>
          <div className="hidden lg:block">{Actions}</div>
        </div>
      </div>
      {/* Mobile sticky action bar (sits above the app bottom nav) */}
      <div className="fixed inset-x-0 bottom-[calc(58px+env(safe-area-inset-bottom))] z-40 border-t-2 border-char bg-cream-100 p-3 lg:hidden">
        <div className="mb-2">{Meter}</div>
        {Actions}
      </div>
    </div>
  );
}
