import Image from "next/image";
import Link from "next/link";
import { FeaturedRail } from "@/components/home/FeaturedRail";
import { HeroPizza } from "@/components/home/HeroPizza";
import { db } from "@/lib/db";
import { getSetting } from "@/lib/settings";
import { fmtTime12 } from "@/lib/time";

const MARQUEE = ["100% Halal", "Hand-tossed", "Since 2021", "Dehiwala's favourite", "Home-made sauce", "Every 10th order free", "Detroit squares", "Fresh juices"];

function Marquee({ dark }: { dark?: boolean }) {
  const row = [...MARQUEE, ...MARQUEE];
  return (
    <div className={`overflow-hidden border-y-2 border-char py-3 ${dark ? "bg-char text-cream" : "bg-mustard text-char"}`}>
      <div className="flex w-max animate-marquee gap-8 whitespace-nowrap font-condensed text-2xl uppercase tracking-wide">
        {row.map((m, i) => (
          <span key={i} className="flex items-center gap-8">
            {m}
            <span className="text-tomato">✦</span>
          </span>
        ))}
      </div>
    </div>
  );
}

export default async function Home() {
  const [shop, hours, loyalty, zones] = await Promise.all([
    getSetting("shop"),
    getSetting("hours"),
    getSetting("loyalty"),
    db.deliveryZone.findMany({ where: { active: true }, orderBy: { sortOrder: "asc" } }),
  ]);
  const stamps = loyalty.stampsRequired;

  return (
    <div className="overflow-x-hidden">
      {/* ───────── HERO ───────── */}
      <section className="grain relative overflow-hidden bg-char text-cream">
        <div className="absolute inset-0 sunburst" />
        <div className="absolute -right-40 -top-40 h-[520px] w-[520px] rounded-full bg-tomato/20 blur-3xl" />
        <div className="relative mx-auto grid max-w-7xl items-center gap-10 px-4 pb-16 pt-6 md:grid-cols-[1.1fr_1fr] md:pb-28 md:pt-16">
          <div>
            <div className="mb-5 flex flex-wrap gap-2">
              {shop.halal && <span className="chip border-cream bg-basil text-white">100% Halal</span>}
              <span className="chip border-cream bg-transparent text-cream">Est. {shop.since} · Dehiwala</span>
            </div>
            <h1 className="h-display text-[15vw] text-cream md:text-[7.5rem]">
              Hungry<span className="block text-tomato">Bar</span>
            </h1>
            <p className="mt-6 max-w-lg text-lg text-cream/80 md:text-xl">
              Hand-tossed, home-made sauce, real mozzarella. <strong className="text-cream">Build your pizza scoop by scoop</strong> and watch it come alive before it hits our oven.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/build" className="btn-primary text-lg">🍕 Build your pizza</Link>
              <Link href="/menu" className="btn bg-cream text-char border-2 border-cream shadow-retro-red text-lg">See the menu</Link>
            </div>
            <div className="mt-10 flex flex-wrap gap-6 text-sm">
              <div>
                <p className="font-condensed text-3xl text-mustard">{fmtTime12(hours.pizza.open)}–{fmtTime12(hours.pizza.close).replace(" midnight", "")}</p>
                <p className="uppercase tracking-widest text-cream/60">Pizza oven</p>
              </div>
              <div>
                <p className="font-condensed text-3xl text-mustard">{fmtTime12(hours.cafe.open)}–{fmtTime12(hours.cafe.close)}</p>
                <p className="uppercase tracking-widest text-cream/60">Paninis & juices</p>
              </div>
              <div>
                <p className="font-condensed text-3xl text-mustard">Free</p>
                <p className="uppercase tracking-widest text-cream/60">Delivery in Dehiwala</p>
              </div>
            </div>
          </div>
          <div className="relative order-first mx-auto aspect-square w-full max-w-[290px] md:order-none md:max-w-[520px]">
            <Image src="/brand/logo.png" alt="" width={600} height={600} className="absolute -left-6 -top-4 h-20 w-20 animate-wiggle opacity-90 md:-left-10 md:-top-10 md:h-40 md:w-40" />
            <HeroPizza />
          </div>
        </div>
      </section>
      <Marquee />

      {/* ───────── HOW IT WORKS ───────── */}
      <section className="grain dots relative py-20">
        <div className="mx-auto max-w-7xl px-4">
          <p className="text-center font-bold uppercase tracking-[.3em] text-tomato">Your pizza, your rules</p>
          <h2 className="h-display mt-2 text-center text-5xl md:text-7xl">Watch it come alive</h2>
          <div className="mt-12 grid gap-6 md:grid-cols-4">
            {[
              ["01", "Pick a size", "1, 2 or 4 person — or a Detroit box."],
              ["02", "Choose your base", "Thick & hand-tossed or thin & crispy."],
              ["03", "Scoop & stack", "Sauce scoops, cheese, halal meats, crunchy veg — the price updates live."],
              ["04", "Hot to your door", "Free delivery around Dehiwala, or pick it up."],
            ].map(([n, t, d], i) => (
              <div key={n} className={`card relative p-6 ${i % 2 ? "md:translate-y-8" : ""}`}>
                <span className="absolute -top-5 left-5 rounded-full border-2 border-char bg-tomato px-3 py-1 font-display text-lg text-white">{n}</span>
                <h3 className="mt-3 font-condensed text-3xl uppercase">{t}</h3>
                <p className="mt-2 text-char-500">{d}</p>
              </div>
            ))}
          </div>
          <div className="mt-16 text-center">
            <Link href="/build" className="btn-dark text-lg">Start building →</Link>
          </div>
        </div>
      </section>

      {/* ───────── SIGNATURES ───────── */}
      <section className="border-y-2 border-char bg-cream-200 py-16">
        <div className="mx-auto max-w-7xl px-4">
          <div className="mb-8 flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="font-bold uppercase tracking-[.3em] text-tomato">Original pizzas</p>
              <h2 className="h-display text-5xl md:text-6xl">The Signatures</h2>
            </div>
            <Link href="/menu" className="font-bold underline">Full menu →</Link>
          </div>
          <FeaturedRail />
        </div>
      </section>

      {/* ───────── TWO SHIFTS ───────── */}
      <section className="py-20">
        <div className="mx-auto grid max-w-7xl gap-6 px-4 md:grid-cols-2">
          <div className="card relative overflow-hidden bg-mustard p-8 md:p-10">
            <p className="font-bold uppercase tracking-[.3em]">Rise & shine</p>
            <h3 className="h-display mt-2 text-5xl">The Toast Theory</h3>
            <p className="mt-3 max-w-sm text-lg">Pressed paninis, fresh-squeezed juices and icy mojitos for breakfast, lunch and dinner.</p>
            <p className="mt-6 font-condensed text-4xl">{fmtTime12(hours.cafe.open)} – {fmtTime12(hours.cafe.close)}</p>
            <Link href="/menu#paninis" className="btn-dark mt-6">See paninis & juices</Link>
            <div className="absolute -bottom-6 -right-6 text-[9rem] leading-none opacity-90">🥪</div>
          </div>
          <div className="card relative overflow-hidden bg-tomato p-8 text-white md:p-10">
            <p className="font-bold uppercase tracking-[.3em] text-cream">Oven&apos;s on</p>
            <h3 className="h-display mt-2 text-5xl">Pizza Hours</h3>
            <p className="mt-3 max-w-sm text-lg text-cream/90">Hand-tossed rounds and crispy-edged Detroit squares, fired till midnight.</p>
            <p className="mt-6 font-condensed text-4xl">{fmtTime12(hours.pizza.open)} – {fmtTime12(hours.pizza.close)}</p>
            <Link href="/menu#original-pizzas" className="btn mt-6 border-2 border-char bg-white text-char shadow-retro">Order pizza</Link>
            <div className="absolute -bottom-6 -right-6 text-[9rem] leading-none">🍕</div>
          </div>
        </div>
      </section>

      {/* ───────── REWARDS ───────── */}
      {loyalty.enabled && (
        <section id="rewards" className="grain relative scroll-mt-20 overflow-hidden border-y-2 border-char bg-char py-20 text-cream">
          <div className="absolute inset-0 sunburst" />
          <div className="relative mx-auto grid max-w-7xl items-center gap-10 px-4 md:grid-cols-2">
            <div>
              <p className="font-bold uppercase tracking-[.3em] text-mustard">Hungry Bar Rewards</p>
              <h2 className="h-display mt-2 text-5xl md:text-7xl">Every {stamps}th order is <span className="text-tomato">free</span></h2>
              <p className="mt-4 max-w-md text-lg text-cream/80">Order with your phone number — online or at the counter — and we stamp your card automatically. Your {stamps}th order comes with a free 1-person pizza. No app, no paper card.</p>
              <Link href="/account" className="btn-primary mt-8">Check my stamps</Link>
            </div>
            <div className="mx-auto w-full max-w-md rotate-[-3deg] rounded-3xl border-4 border-cream bg-cream p-6 text-char shadow-[10px_10px_0_0_#EE4224]">
              <div className="flex items-center justify-between border-b-2 border-dashed border-char/30 pb-3">
                <span className="font-display text-2xl uppercase">Stamp card</span>
                <Image src="/brand/logo.png" alt="" width={56} height={56} className="h-14 w-14" />
              </div>
              <div className="mt-5 grid grid-cols-5 gap-3">
                {Array.from({ length: stamps }, (_, i) => (
                  <div key={i} className={`grid aspect-square place-items-center rounded-full border-[3px] border-char font-display text-lg ${i === stamps - 1 ? "bg-tomato text-white" : i < 6 ? "bg-char text-cream" : "border-dashed bg-white text-char-300"}`}>
                    {i === stamps - 1 ? "FREE" : i < 6 ? "✓" : i + 1}
                  </div>
                ))}
              </div>
              <p className="mt-4 text-center text-sm font-bold uppercase tracking-widest text-char-400">6 down · {stamps - 7} to go · then pizza&apos;s on us</p>
            </div>
          </div>
        </section>
      )}

      {/* ───────── DELIVERY + VISIT ───────── */}
      <section className="py-20">
        <div className="mx-auto grid max-w-7xl gap-8 px-4 md:grid-cols-[1fr_1.2fr]">
          <div>
            <p className="font-bold uppercase tracking-[.3em] text-tomato">Where we deliver</p>
            <h2 className="h-display mt-2 text-5xl">Hot to your door</h2>
            <ul className="mt-6 divide-y-2 divide-dashed divide-char/20 border-y-2 border-char">
              {zones.map((z) => (
                <li key={z.id} className="flex items-center justify-between py-3">
                  <span className="font-bold">{z.name}</span>
                  <span className={`chip ${z.fee === 0 ? "bg-basil text-white" : "bg-white"}`}>{z.fee === 0 ? "Free" : `Rs. ${z.fee}`}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="card overflow-hidden">
            <div className="checker h-6 border-b-2 border-char" />
            <div className="p-8">
              <h3 className="h-display text-4xl">Come say hi</h3>
              <p className="mt-2 text-lg">{shop.address}</p>
              <div className="mt-6 grid gap-3 sm:grid-cols-2">
                <a href={`tel:${shop.phone.replace(/\s/g, "")}`} className="btn-dark">📞 {shop.phone}</a>
                <a href={`https://wa.me/${shop.whatsapp}`} target="_blank" rel="noreferrer" className="btn border-2 border-char bg-[#25D366] text-white shadow-retro">WhatsApp</a>
                <a href={shop.mapUrl} target="_blank" rel="noreferrer" className="btn-ghost sm:col-span-2">📍 Get directions</a>
              </div>
              <p className="mt-6 text-sm text-char-500">Dining in? Scan the QR on your table to order straight to the kitchen.</p>
            </div>
          </div>
        </div>
      </section>
      <Marquee dark />
    </div>
  );
}
