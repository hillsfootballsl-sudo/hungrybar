"use client";
import Link from "next/link";
import { useStore } from "./StoreProvider";
import { Icon, RewardsMark } from "./ui";

export function RewardsClient() {
  const s = useStore();
  const r = s.config.rewards;
  const pts = s.me?.points ?? 0;
  const next = s.catalog.rewards.find((x) => x.points > pts);
  return (
    <div className="doodles pb-10">
      <section className="doodles-dark relative overflow-hidden pb-20 pt-10 text-center text-white md:pb-24 md:pt-14">
        <div className="absolute right-4 top-4 hidden text-xl md:block"><RewardsMark light /></div>
        <div className="mx-auto grid h-20 w-20 place-items-center rounded-[22px] bg-mustard text-char shadow-xl md:h-24 md:w-24" style={{ clipPath: "polygon(50% 0, 100% 25%, 100% 75%, 50% 100%, 0 75%, 0 25%)" }}>
          <Icon name="star" className="h-10 w-10" />
        </div>
        <h1 className="mt-4 px-4 text-3xl font-extrabold md:text-5xl">{s.me ? `${pts.toLocaleString()} points` : "Don't miss a bite"}</h1>
        <p className="mt-1 px-4 font-bold text-white/85">{s.me ? (next ? `${(next.points - pts).toLocaleString()} more to unlock “${next.name}”` : "You can claim every reward on the list!") : `Enroll in ${r.programName} today!`}</p>
      </section>
      <div className="relative -mt-9 flex justify-center px-4">
        <div className="rounded-full bg-char px-6 py-4 shadow-xl">
          {s.me ? (
            <Link href="/menu" className="btn-mustard">Order & earn <Icon name="arrow" className="h-4 w-4" /></Link>
          ) : (
            <button onClick={() => s.openLogin()} className="btn-mustard">Login / Register <Icon name="arrow" className="h-4 w-4" /></button>
          )}
        </div>
      </div>

      <section className="mx-auto max-w-4xl px-5 pt-12 text-center">
        <div className="text-3xl md:text-4xl"><RewardsMark /></div>
        <h2 className="mt-3 text-2xl font-extrabold md:text-4xl">Where <span className="italic text-tomato">every bite</span> pays you back.</h2>
      </section>

      <section className="mx-auto mt-10 grid grid-cols-1 max-w-5xl gap-10 px-5 md:grid-cols-2">
        <div>
          <h3 className="text-2xl font-extrabold md:text-3xl">Stack up points like<br /><span className="text-tomato">toppings!</span></h3>
        </div>
        <ul className="list-disc space-y-2 pl-5 font-bold">
          <li>Spend Rs. {r.rupeesPerPoint} → earn 1 {r.pointName.replace(/s$/, "")}.</li>
          <li>Points land when your order is completed.</li>
          <li>Good for {r.expiryMonths} months from the day you earn them.</li>
          <li>Swap them for free food from the rewards menu below.</li>
        </ul>
        <div>
          <h3 className="text-2xl font-extrabold md:text-3xl">Perks that taste<br /><span className="text-tomato">even better</span></h3>
        </div>
        <ul className="list-disc space-y-2 pl-5 font-bold">
          {r.welcomeBonus > 0 && <li>First time? {r.welcomeBonus} bonus points after your first order.</li>}
          {r.birthdayBonus > 0 && <li>Birthday coming up? We drop {r.birthdayBonus} points into your account a week before. Use them within {r.bonusValidDays} days.</li>}
          {r.anniversaryBonus > 0 && <li>Anniversary? Another {r.anniversaryBonus} points, same deal.</li>}
        </ul>
      </section>

      <section className="mx-auto mt-14 max-w-5xl px-5">
        <h3 className="text-center text-2xl font-extrabold md:text-3xl">The rewards menu</h3>
        <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {s.catalog.rewards.map((rw) => {
            const ok = s.me && pts >= rw.points;
            const pct = Math.min(100, s.me ? (pts / rw.points) * 100 : 0);
            return (
              <div key={rw.id} className="card p-5">
                <div className="flex items-baseline justify-between gap-2">
                  <p className="font-condensed text-4xl text-tomato">{rw.points.toLocaleString()}</p>
                  <span className="text-xs font-bold uppercase tracking-widest text-char-400">points</span>
                </div>
                <p className="mt-1 text-lg font-extrabold">{rw.name}</p>
                <p className="text-sm text-char-500">{rw.description}</p>
                {s.me && (
                  <div className="mt-3">
                    <div className="h-2 overflow-hidden rounded-full bg-char-50"><div className={`h-full rounded-full ${ok ? "bg-basil" : "bg-mustard"}`} style={{ width: `${pct}%` }} /></div>
                    <p className="mt-1 text-xs font-bold text-char-500">{ok ? "Ready to claim from your cart" : `${(rw.points - pts).toLocaleString()} to go`}</p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      <section className="mx-auto mt-12 grid grid-cols-1 max-w-5xl gap-4 px-5 text-center font-bold text-basil sm:grid-cols-3">
        <p>No minimum order. Ever.</p>
        <p>Works on website, app, takeaway and dine-in (give your number at the counter).</p>
        <p>Points are personal: they follow your phone number.</p>
      </section>
      <section className="mx-auto mt-10 max-w-3xl px-5 text-center">
        <p className="text-lg font-extrabold">All you need is your name and mobile number (with a one-time code) to start.</p>
        <p className="mt-1 text-char-500">Add your birthday so it comes with extra cheese (and extra points).</p>
      </section>
    </div>
  );
}
