"use client";
import { useEffect } from "react";
import { ItemArt } from "@/components/ItemArt";
import { PizzaArt } from "@/components/PizzaArt";
import type { Catalog, CatProduct } from "@/lib/types";

const P: Record<string, string> = {
  menu: "M4 6h16M4 12h16M4 18h16",
  pin: "M12 21s-7-6.2-7-11.5A7 7 0 0 1 19 9.5C19 14.8 12 21 12 21zm0-9a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5z",
  clock: "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zm0-13v5l3 2",
  down: "M6 9l6 6 6-6",
  right: "M9 6l6 6-6 6",
  left: "M15 6l-6 6 6 6",
  arrow: "M5 12h14M13 6l6 6-6 6",
  heart: "M12 20s-7-4.5-9.3-9A5 5 0 0 1 12 6a5 5 0 0 1 9.3 5c-2.3 4.5-9.3 9-9.3 9z",
  info: "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zm0-11v6m0-9h.01",
  user: "M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zm-7 9a7 7 0 0 1 14 0",
  bag: "M5 8h14l-1.2 12H6.2L5 8zm4 0V7a3 3 0 0 1 6 0v1",
  close: "M6 6l12 12M18 6L6 18",
  plus: "M12 5v14M5 12h14",
  minus: "M5 12h14",
  star: "M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1L3.2 9.5l6.1-.9z",
  gift: "M4 11h16v9H4zM3 7h18v4H3zm9 0v13M12 7c-2-4-6-3-5 0m5 0c2-4 6-3 5 0",
  search: "M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14zm9 3-4.3-4.3",
  home: "M3 11l9-7 9 7v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z",
  tag: "M3 12V4h8l10 10-8 8L3 12zm5-4h.01",
  trash: "M4 7h16M10 11v6m4-6v6M6 7l1 13h10l1-13M9 7V4h6v3",
  edit: "M4 20h4L19 9l-4-4L4 16v4zM14 6l4 4",
  phone: "M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2",
  download: "M12 4v11m-5-5 5 5 5-5M5 20h14",
  bike: "M5 18a3 3 0 1 0 0-6 3 3 0 0 0 0 6zm14 0a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM8 15l4-7h4l3 7M12 8l-2-3H7",
  store: "M4 10v10h16V10M3 10l2-6h14l2 6zM9 20v-5h6v5",
  check: "M5 12l5 5 9-10",
  bell: "M6 16V11a6 6 0 0 1 12 0v5l2 2H4zm4 4h4",
  logout: "M15 4h4v16h-4M10 8l-4 4 4 4M6 12h10",
  share: "M12 3v12M7 8l5-5 5 5M5 14v6h14v-6",
};

export function Icon({ name, className = "h-5 w-5", fill }: { name: keyof typeof P | string; className?: string; fill?: boolean }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill={fill ? "currentColor" : "none"} stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={P[name] ?? P.info} />
    </svg>
  );
}

export function VegMark({ veg }: { veg: boolean }) {
  return <span className={veg ? "veg-mark" : "nonveg-mark"} title={veg ? "Vegetarian" : "Non-vegetarian"} aria-label={veg ? "Vegetarian" : "Non-vegetarian"} />;
}

/** Product photo, or our drawn art when there's no photo yet */
export function ProductPhoto({ product, catalog, className = "", sizeId, toppings, live }: { product: CatProduct; catalog: Catalog; className?: string; sizeId?: string; toppings?: Record<string, number>; live?: boolean }) {
  if (product.image && !live) return <img src={product.image} alt={product.name} loading="lazy" className={`h-full w-full object-cover ${className}`} />;
  if (product.kind === "PIZZA") {
    const size = sizeId ?? product.variants[0]?.sizeId ?? undefined;
    return (
      <div className={`grid h-full w-full place-items-center bg-[radial-gradient(circle_at_50%_40%,#4a4a4a,#1f1f1f)] ${className}`}>
        <PizzaArt catalog={catalog} sizeId={size} crustId={catalog.crusts[0]?.id} toppings={toppings ?? product.toppings} board={false} animate={!!live} scaleBySize={false} className="h-[88%] w-[88%] drop-shadow-2xl" />
      </div>
    );
  }
  if (product.kind === "COMBO") return <ComboArt product={product} catalog={catalog} className={className} />;
  return (
    <div className={`grid h-full w-full place-items-center bg-[radial-gradient(circle_at_50%_40%,#FFF8EA,#F3E3C3)] ${className}`}>
      <ItemArt art={product.art} className="h-[70%] w-[70%] drop-shadow-lg" />
    </div>
  );
}

/** Collage for a combo: first option of each slot */
export function ComboArt({ product, catalog, className = "" }: { product: CatProduct; catalog: Catalog; className?: string }) {
  const firsts = product.slots.map((s) => catalog.products.find((p) => p.id === s.options[0]?.productId)).filter(Boolean) as CatProduct[];
  const pizza = firsts.find((p) => p.kind === "PIZZA");
  const others = firsts.filter((p) => p !== pizza).slice(0, 3);
  const photo = firsts.find((p) => p.image);
  if (product.image) return <img src={product.image} alt={product.name} className={`h-full w-full object-cover ${className}`} />;
  return (
    <div className={`relative h-full w-full overflow-hidden bg-[radial-gradient(circle_at_30%_40%,#F26549,#B8301A)] ${className}`}>
      {pizza ? (
        pizza.image ? (
          <img src={pizza.image} alt="" className="absolute -left-[8%] top-[6%] h-[92%] w-auto rounded-full object-cover" />
        ) : (
          <div className="absolute -left-[6%] top-[8%] h-[88%] aspect-square">
            <PizzaArt catalog={catalog} sizeId={product.slots[0]?.options[0]?.sizeId ?? pizza.variants[0]?.sizeId ?? undefined} toppings={pizza.toppings} board={false} animate={false} scaleBySize={false} className="h-full w-full drop-shadow-2xl" />
          </div>
        )
      ) : photo ? (
        <img src={photo.image!} alt="" className="absolute inset-0 h-full w-full object-cover" />
      ) : null}
      <div className="absolute bottom-[6%] right-[4%] flex w-[60%] justify-end gap-[3%]">
        {others.map((o) => (
          <div key={o.id} className="grid aspect-square w-[32%] place-items-center rounded-[18%] bg-white/90 shadow-lg">
            {o.image ? <img src={o.image} alt="" className="h-full w-full rounded-[18%] object-cover" /> : <ItemArt art={o.art} className="h-[80%] w-[80%]" />}
          </div>
        ))}
      </div>
    </div>
  );
}

export function RewardsMark({ className = "", light }: { className?: string; light?: boolean }) {
  return (
    <span className={`inline-flex items-center gap-1 leading-none ${className}`} aria-label="Hungry Rewards">
      <span className={`font-display text-[1.05em] ${light ? "text-white" : "text-tomato"}`}>HUNGRY</span>
      <span className={`rounded-[4px] px-1.5 pb-[2px] pt-[3px] font-condensed text-[1.05em] tracking-wide ${light ? "bg-tomato text-white" : "bg-char text-white"}`}>REWARDS</span>
    </span>
  );
}

/** Bottom sheet on phones, centred dialog on larger screens */
export function Sheet({ open, onClose, children, wide, label, flush }: { open: boolean; onClose: () => void; children: React.ReactNode; wide?: boolean; label: string; flush?: boolean }) {
  useEffect(() => {
    if (!open) return;
    const k = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", k);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", k);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[80] flex items-end justify-center bg-char/60 backdrop-blur-[2px] md:items-center md:p-6" onClick={onClose} role="dialog" aria-modal="true" aria-label={label}>
      <div
        className={`relative max-h-[94dvh] w-full overflow-hidden rounded-t-[28px] bg-white shadow-2xl md:rounded-[28px] ${wide ? "md:max-w-5xl" : "md:max-w-md"} ${flush ? "" : "overflow-y-auto p-5 md:p-7"} animate-[sheetUp_.25s_ease-out] safe-bottom`}
        onClick={(e) => e.stopPropagation()}
      >
        <button onClick={onClose} className="absolute right-3 top-3 z-20 grid h-10 w-10 place-items-center rounded-full bg-white/90 text-char shadow hover:bg-char-50" aria-label="Close">
          <Icon name="close" />
        </button>
        {children}
      </div>
    </div>
  );
}

export function Stepper({ value, onChange, min = 0, max = 10, label, dark }: { value: number; onChange: (v: number) => void; min?: number; max?: number; label?: string; dark?: boolean }) {
  return (
    <div className={`flex h-10 shrink-0 items-center rounded-full ${dark ? "bg-char text-white" : "border border-char-200 bg-white"}`}>
      <button type="button" className="grid h-10 w-9 place-items-center disabled:opacity-30" disabled={value <= min} onClick={() => onChange(value - 1)} aria-label="Less">
        <Icon name="minus" className="h-4 w-4" />
      </button>
      <span className="min-w-[3.6rem] text-center text-[13px] font-bold">{label ?? value}</span>
      <button type="button" className="grid h-10 w-9 place-items-center disabled:opacity-30" disabled={value >= max} onClick={() => onChange(value + 1)} aria-label="More">
        <Icon name="plus" className="h-4 w-4" />
      </button>
    </div>
  );
}
