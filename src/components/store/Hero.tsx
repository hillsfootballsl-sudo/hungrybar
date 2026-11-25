"use client";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { ItemArt } from "@/components/ItemArt";
import { PizzaArt } from "@/components/PizzaArt";
import { useStore } from "./StoreProvider";
import { Icon } from "./ui";

export interface BannerT { id: string; title: string; subtitle: string | null; image: string | null; link: string; cta: string; theme: string }

const THEME: Record<string, string> = {
  dark: "bg-[radial-gradient(circle_at_70%_50%,#3d3d3d,#1b1b1b)] text-white",
  red: "bg-[radial-gradient(circle_at_70%_50%,#F26549,#B8301A)] text-white",
  cream: "bg-[radial-gradient(circle_at_70%_50%,#FFF6E3,#F1DDB3)] text-char",
};

function Slide({ b, index }: { b: BannerT; index: number }) {
  const s = useStore();
  const pizzas = s.catalog.products.filter((p) => p.kind === "PIZZA" && p.featured);
  const p = pizzas[index % Math.max(1, pizzas.length)];
  const big = s.catalog.sizes.find((x) => x.shape !== "RECT" && x.persons >= 4) ?? s.catalog.sizes[0];
  return (
    <Link href={b.link} className={`relative block h-full w-full overflow-hidden rounded-[22px] md:rounded-[28px] ${b.image ? "bg-char text-white" : THEME[b.theme] ?? THEME.dark}`}>
      {b.image ? (
        <>
          <img src={b.image} alt="" className="absolute inset-0 h-full w-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-black/30 to-transparent" />
        </>
      ) : (
        <div className="absolute -right-[34%] top-1/2 aspect-square h-[118%] -translate-y-1/2 sm:-right-[14%] sm:h-[130%] lg:-right-[4%] lg:h-[135%]">
          {p && <PizzaArt catalog={s.catalog} sizeId={big?.id} toppings={p.toppings} board={false} animate={false} sliced scaleBySize={false} className="h-full w-full drop-shadow-2xl" />}
          {index % 3 === 2 && <ItemArt art="mojito:#B8E986" className="absolute bottom-[18%] left-[-6%] h-[30%] w-[30%] drop-shadow-xl" />}
        </div>
      )}
      {!b.image && <div className={`absolute inset-y-0 left-0 w-[70%] lg:hidden ${b.theme === "red" ? "bg-gradient-to-r from-[#C8361C] via-[#C8361C]/80" : b.theme === "cream" ? "bg-gradient-to-r from-[#F6E7C6] via-[#F6E7C6]/80" : "bg-gradient-to-r from-[#222] via-[#222]/80"} to-transparent`} />}
      <div className="relative flex h-full max-w-[66%] flex-col justify-center p-5 sm:max-w-[58%] md:p-10 lg:max-w-[52%] lg:p-12">
        <h2 className="font-condensed text-[clamp(2rem,6vw,4.6rem)] uppercase leading-[.92]">{b.title}</h2>
        {b.subtitle && <p className="mt-2 max-w-md text-sm font-bold opacity-85 md:mt-3 md:text-lg">{b.subtitle}</p>}
        <span className={`mt-4 inline-flex w-fit items-center gap-2 rounded-full px-5 py-2.5 text-sm font-extrabold md:mt-6 md:text-base ${b.theme === "cream" && !b.image ? "bg-char text-white" : "bg-white text-char"}`}>
          {b.cta} <Icon name="arrow" className="h-4 w-4" />
        </span>
      </div>
    </Link>
  );
}

export function HeroCarousel({ banners }: { banners: BannerT[] }) {
  const [i, setI] = useState(0);
  const n = banners.length;
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);
  const go = useCallback((d: number) => setI((x) => (x + d + n) % n), [n]);
  useEffect(() => {
    if (n < 2) return;
    timer.current = setInterval(() => go(1), 6000);
    return () => {
      if (timer.current) clearInterval(timer.current);
    };
  }, [go, n]);
  const touch = useRef<number | null>(null);
  if (!n) return null;
  return (
    <section className="relative overflow-hidden pt-4 md:pt-6" aria-roledescription="carousel" aria-label="Offers">
      <div
        className="relative mx-auto h-[220px] max-w-[1400px] sm:h-[300px] md:h-[380px]"
        onTouchStart={(e) => (touch.current = e.touches[0].clientX)}
        onTouchEnd={(e) => {
          if (touch.current == null) return;
          const dx = e.changedTouches[0].clientX - touch.current;
          if (Math.abs(dx) > 40) go(dx < 0 ? 1 : -1);
          touch.current = null;
        }}
      >
        {banners.map((b, k) => {
          const off = ((k - i + n + 1) % n) - 1; // -1 prev, 0 current, 1 next
          const pos = off === 0 ? "left-[4%] right-[4%] lg:left-[17%] lg:right-[17%] z-20 opacity-100" : off === -1 ? "-left-[60%] right-[86%] lg:-left-[46%] lg:right-[85%] z-10 opacity-60 lg:opacity-90" : off === 1 ? "left-[86%] -right-[60%] lg:left-[85%] lg:-right-[46%] z-10 opacity-60 lg:opacity-90" : "left-[4%] right-[4%] opacity-0 z-0";
          return (
            <div key={b.id} className={`absolute bottom-0 top-0 transition-all duration-500 ease-out ${pos} ${off === 0 ? "" : "scale-[.92]"}`} aria-hidden={off !== 0}>
              <Slide b={b} index={k} />
            </div>
          );
        })}
        {n > 1 && (
          <>
            <button onClick={() => go(-1)} className="absolute left-2 top-1/2 z-30 hidden h-11 w-11 -translate-y-1/2 place-items-center rounded-full bg-white shadow-lg md:grid" aria-label="Previous"><Icon name="left" /></button>
            <button onClick={() => go(1)} className="absolute right-2 top-1/2 z-30 hidden h-11 w-11 -translate-y-1/2 place-items-center rounded-full bg-white shadow-lg md:grid" aria-label="Next"><Icon name="right" /></button>
          </>
        )}
      </div>
      {n > 1 && (
        <div className="mt-1 flex justify-center">
          {banners.map((b, k) => (
            <button key={b.id} onClick={() => setI(k)} className="grid h-8 min-w-8 place-items-center px-1" aria-label={`Slide ${k + 1}`} aria-current={k === i}>
              <span className={`block h-2.5 rounded-full transition-all ${k === i ? "w-8 bg-tomato" : "w-2.5 bg-char-200"}`} />
            </button>
          ))}
        </div>
      )}
    </section>
  );
}
