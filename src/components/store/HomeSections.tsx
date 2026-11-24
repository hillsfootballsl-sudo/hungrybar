"use client";
import Link from "next/link";
import { ItemArt } from "@/components/ItemArt";
import { PizzaArt } from "@/components/PizzaArt";
import { fmtTime12 } from "@/lib/time";
import { useInstall } from "./Install";
import { ProductCard } from "./ProductCard";
import { useStore } from "./StoreProvider";
import { ComboArt, Icon, RewardsMark } from "./ui";

function SectionTitle({ children, href, more }: { children: React.ReactNode; href?: string; more?: string }) {
  return (
    <div className="mb-5 flex items-end justify-between gap-3">
      <h2 className="text-2xl font-extrabold md:text-[32px]">{children}</h2>
      {href && (
        <Link href={href} className="flex shrink-0 items-center gap-1 rounded-full border border-char-200 px-4 py-2 text-sm font-bold hover:border-char">
          {more ?? "See all"} <Icon name="arrow" className="h-4 w-4" />
        </Link>
      )}
    </div>
  );
}

export function ExploreMenu() {
  const s = useStore();
  const cats = s.catalog.categories.filter((c) => c.showOnHome);
  return (
    <section className="mx-auto max-w-[1400px] px-4 pt-10 md:px-6">
      <h2 className="mb-5 text-center text-2xl font-extrabold md:text-[32px]">Explore Our Menu</h2>
      <div className="no-scrollbar -mx-4 flex snap-x gap-3 overflow-x-auto px-4 pb-2 md:mx-0 md:grid md:grid-cols-4 md:gap-5 md:overflow-visible md:px-0 lg:grid-cols-8">
        {cats.map((c) => {
          const first = s.catalog.products.find((p) => p.categoryId === c.id);
          return (
            <Link key={c.id} href={`/menu?c=${c.slug}`} className="group w-[38%] shrink-0 snap-start sm:w-[28%] md:w-auto">
              <div className="aspect-square overflow-hidden rounded-[22px] shadow-[0_4px_18px_rgba(0,0,0,.10)]">
                {c.image ? (
                  <img src={c.image} alt="" className="h-full w-full object-cover transition duration-500 group-hover:scale-105" />
                ) : first?.image ? (
                  <img src={first.image} alt="" className="h-full w-full object-cover transition duration-500 group-hover:scale-105" />
                ) : first?.kind === "PIZZA" ? (
                  <div className="grid h-full w-full place-items-center bg-[radial-gradient(circle,#4a4a4a,#1c1c1c)]"><PizzaArt catalog={s.catalog} sizeId={first.variants[0]?.sizeId ?? undefined} toppings={first.toppings} board={false} animate={false} scaleBySize={false} className="h-[86%] w-[86%] transition duration-500 group-hover:rotate-12" /></div>
                ) : first?.kind === "COMBO" ? (
                  <ComboArt product={first} catalog={s.catalog} />
                ) : (
                  <div className="grid h-full w-full place-items-center bg-[radial-gradient(circle,#FFF8EA,#F1DDB3)]"><ItemArt art={first?.art ?? c.icon} className="h-[70%] w-[70%] transition duration-500 group-hover:scale-110" /></div>
                )}
              </div>
              <p className="mt-2 text-center text-sm font-extrabold md:text-base">{c.name}</p>
            </Link>
          );
        })}
      </div>
    </section>
  );
}

export function Rail({ title, href, ids, kind }: { title: string; href?: string; ids?: string[]; kind?: "COMBO" | "BEST" | "FAV" }) {
  const s = useStore();
  let list = s.catalog.products;
  if (kind === "COMBO") list = list.filter((p) => p.kind === "COMBO");
  else if (kind === "BEST") list = list.filter((p) => p.kind !== "COMBO" && (p.featured || p.tags.includes("bestseller")));
  else if (kind === "FAV") list = list.filter((p) => s.favourites.includes(p.id));
  if (ids) list = list.filter((p) => ids.includes(p.id));
  if (!list.length) return null;
  return (
    <section className="mx-auto max-w-[1400px] px-4 pt-12 md:px-6">
      <SectionTitle href={href}>{title}</SectionTitle>
      <div className="no-scrollbar -mx-4 flex snap-x gap-4 overflow-x-auto px-4 pb-4 md:-mx-6 md:px-6">
        {list.map((p) => (
          <div key={p.id} className="w-[82%] shrink-0 snap-start sm:w-[46%] md:w-[31%] xl:w-[23.5%]">
            <ProductCard p={p} />
          </div>
        ))}
      </div>
    </section>
  );
}

export function Favourites() {
  const s = useStore();
  const detroit = s.catalog.categories.find((c) => c.icon === "detroit");
  const dProd = s.catalog.products.find((p) => p.categoryId === detroit?.id);
  const rect = s.catalog.sizes.find((x) => x.shape === "RECT");
  const pizza = s.catalog.products.find((p) => p.kind === "PIZZA" && p.featured);
  return (
    <section className="mx-auto max-w-[1400px] px-4 pt-12 md:px-6">
      <h2 className="mb-5 text-center text-2xl font-extrabold md:text-[32px]">Explore Our Favourites</h2>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-6">
        <button onClick={() => s.openCustomise({})} className="group relative flex h-56 overflow-hidden rounded-[28px] text-left md:h-72">
          <div className="relative w-1/2 bg-[radial-gradient(circle,#4a4a4a,#1b1b1b)]">
            {pizza && <PizzaArt catalog={s.catalog} sizeId={pizza.variants[1]?.sizeId ?? undefined} toppings={pizza.toppings} board={false} animate={false} scaleBySize={false} className="absolute -left-[12%] top-1/2 h-[120%] w-auto -translate-y-1/2 transition duration-700 group-hover:rotate-45" />}
          </div>
          <div className="flex w-1/2 flex-col justify-center bg-tomato p-5 text-white md:p-8">
            <p className="font-condensed text-[clamp(2rem,4.5vw,3.6rem)] uppercase leading-[.9]">Build<br />your own</p>
            <p className="mt-2 text-sm font-bold text-white/85">Watch it come alive, scoop by scoop</p>
            <span className="mt-4 inline-flex w-fit items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-extrabold text-char">Start <Icon name="arrow" className="h-4 w-4" /></span>
          </div>
        </button>
        {detroit && (
          <Link href={`/menu?c=${detroit.slug}`} className="group relative flex h-56 overflow-hidden rounded-[28px] md:h-72">
            <div className="relative w-1/2 bg-[radial-gradient(circle,#4a4a4a,#1b1b1b)]">
              {dProd && rect && <PizzaArt catalog={s.catalog} sizeId={rect.id} toppings={dProd.toppings} board={false} animate={false} className="absolute left-[-18%] top-1/2 h-[118%] w-auto -translate-y-1/2 rotate-[-8deg] transition duration-700 group-hover:rotate-0" />}
            </div>
            <div className="flex w-1/2 flex-col justify-center bg-mustard p-5 text-char md:p-8">
              <p className="font-condensed text-[clamp(2rem,4.5vw,3.6rem)] uppercase leading-[.9]">Detroit<br />squares</p>
              <p className="mt-2 text-sm font-bold text-char/75">Crispy caramelised cheese edges</p>
              <span className="mt-4 inline-flex w-fit items-center gap-2 rounded-full bg-char px-4 py-2 text-sm font-extrabold text-white">Order <Icon name="arrow" className="h-4 w-4" /></span>
            </div>
          </Link>
        )}
      </div>
    </section>
  );
}

export function RewardsBand() {
  const s = useStore();
  const r = s.config.rewards;
  if (!r.enabled) return null;
  return (
    <section className="mx-auto max-w-[1400px] px-4 pt-14 md:px-6">
      <div className="doodles-dark relative overflow-hidden rounded-[28px] p-6 text-white md:p-12">
        <div className="grid grid-cols-1 items-center gap-6 md:grid-cols-[1.2fr_1fr]">
          <div>
            <RewardsMark light className="text-2xl md:text-3xl" />
            <h2 className="mt-3 text-3xl font-extrabold md:text-5xl">Where every bite <span className="text-mustard">pays you back.</span></h2>
            <p className="mt-3 max-w-lg text-white/80">Spend Rs. {r.rupeesPerPoint} → earn 1 point. Swap points for free garlic bread, mojitos, subs and pizzas. {r.welcomeBonus} bonus points after your first order.</p>
            <div className="mt-6 flex flex-wrap gap-3">
              {s.me ? (
                <Link href="/account?tab=points" className="btn-mustard">You have {s.me.points.toLocaleString()} points →</Link>
              ) : (
                <button onClick={() => s.openLogin()} className="btn-mustard">Login / Register →</button>
              )}
              <Link href="/rewards" className="btn border border-white/30 text-white hover:bg-white/10">How it works</Link>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {s.catalog.rewards.slice(0, 4).map((rw) => (
              <div key={rw.id} className="rounded-2xl bg-white/10 p-4 backdrop-blur">
                <p className="font-condensed text-3xl text-mustard">{rw.points.toLocaleString()}</p>
                <p className="text-xs font-bold uppercase tracking-wider text-white/60">points</p>
                <p className="mt-1 text-sm font-bold">{rw.name}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

export function AppBand() {
  const s = useStore();
  const i = useInstall();
  return (
    <section className="mx-auto max-w-[1400px] px-4 pt-14 md:px-6">
      <div className="grid grid-cols-1 items-center gap-6 rounded-[28px] bg-cream-100 p-6 md:grid-cols-[auto_1fr_auto] md:p-10">
        <img src="/icons/icon-192.png" alt="" className="h-20 w-20 rounded-3xl bg-white shadow-lg" />
        <div>
          <h2 className="text-2xl font-extrabold md:text-3xl">Hungry Bar on your home screen</h2>
          <p className="mt-1 text-char-500">Install our app in one tap. Faster ordering, your favourites saved, and a ping when your pizza is on the way. Open daily {fmtTime12(s.config.hours.open)} – {fmtTime12(s.config.hours.close)}.</p>
        </div>
        {i.canShow ? (
          <button onClick={i.prompt} className="btn-dark h-14 px-7"><Icon name="download" /> Install app</button>
        ) : (
          <Link href="/menu" className="btn-primary h-14 px-7">Order now</Link>
        )}
      </div>
    </section>
  );
}
