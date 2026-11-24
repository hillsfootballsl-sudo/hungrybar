"use client";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { fmtTime12 } from "@/lib/time";
import { useInstall } from "./Install";
import { useStore } from "./StoreProvider";
import { Icon, RewardsMark } from "./ui";

function whenLabel(when: string) {
  if (when === "ASAP") return "Order now";
  const d = new Date(when);
  return d.toLocaleString("en-GB", { timeZone: "Asia/Colombo", weekday: "short", hour: "numeric", minute: "2-digit", hour12: true });
}

export function LocationPill({ className = "" }: { className?: string }) {
  const s = useStore();
  const m = s.mode;
  const where =
    m.type === "DINE_IN" ? `Dine-in · Table ${m.tableLabel}` : m.type === "TAKEAWAY" ? "Pickup · Hill Food Square" : m.type === "DELIVERY" && s.zone ? `Delivery · ${s.zone.name}` : "Select location";
  return (
    <button onClick={() => s.openLocation()} className={`flex h-12 w-full items-center rounded-2xl border border-char-100 bg-white text-left shadow-[0_2px_10px_rgba(0,0,0,.05)] transition hover:border-char-200 ${className}`}>
      <span className="flex min-w-0 flex-1 items-center gap-2 px-4">
        <Icon name="pin" className="h-5 w-5 shrink-0 text-tomato" />
        <span className={`truncate text-sm font-bold ${m.type ? "text-char" : "text-char-500"}`}>{where}</span>
      </span>
      <span className="h-6 w-px bg-char-100" />
      <span className="flex items-center gap-1.5 px-3 text-xs font-bold leading-tight text-char-500">
        <Icon name="clock" className="h-4 w-4" />
        <span className="max-w-[5.5rem] truncate">{whenLabel(m.when)}</span>
        <Icon name="down" className="h-4 w-4" />
      </span>
    </button>
  );
}

export function Header() {
  const s = useStore();
  const [drawer, setDrawer] = useState(false);
  const path = usePathname();
  useEffect(() => setDrawer(false), [path]);
  return (
    <>
      <header className="sticky z-50 border-b border-char-100 bg-white/95 backdrop-blur" style={{ top: 0 }}>
        <div className="mx-auto flex h-16 max-w-[1400px] items-center gap-3 px-3 md:h-[76px] md:px-6">
          <button onClick={() => setDrawer(true)} className="grid h-11 w-11 place-items-center rounded-full hover:bg-char-50" aria-label="Open menu">
            <Icon name="menu" className="h-6 w-6" />
          </button>
          <Link href="/" className="flex items-center gap-2" aria-label="Hungry Bar home">
            <Image src="/brand/logo.png" alt="" width={48} height={48} className="h-10 w-10 md:h-12 md:w-12" priority />
            <span className="font-display text-[22px] leading-none text-tomato md:text-[26px]">HUNGRY<span className="text-char">BAR</span></span>
          </Link>
          <div className="mx-auto hidden w-full max-w-[560px] md:block">
            <LocationPill />
          </div>
          <div className="ml-auto flex items-center gap-2 md:ml-0">
            <Link href="/rewards" className="hidden text-[22px] lg:block" aria-label="Hungry Rewards">
              <RewardsMark />
            </Link>
            {s.me ? (
              <Link href="/account" className="flex h-11 items-center gap-2 rounded-full bg-char px-3 text-sm font-bold text-white md:px-4">
                <Icon name="user" className="h-5 w-5" />
                <span className="hidden sm:inline">{s.me.name?.split(" ")[0] || "Account"}</span>
                <span className="whitespace-nowrap rounded-full bg-mustard px-2 py-0.5 text-xs text-char">{s.me.points.toLocaleString()} pts</span>
              </Link>
            ) : (
              <button onClick={() => s.openLogin()} className="btn-dark btn-sm h-11 px-5 md:px-6">
                Sign Up
              </button>
            )}
            <button onClick={() => s.setCartOpen(true)} className="relative hidden h-11 w-11 place-items-center rounded-full hover:bg-char-50 md:grid" aria-label={`Cart, ${s.count} items`}>
              <Icon name="bag" className="h-6 w-6" />
              {s.count > 0 && <span className="absolute -right-0.5 -top-0.5 grid h-5 min-w-5 place-items-center rounded-full bg-tomato px-1 text-[11px] font-bold text-white">{s.count}</span>}
            </button>
          </div>
        </div>
        <div className="px-3 pb-3 md:hidden">
          <LocationPill />
        </div>
      </header>
      <Drawer open={drawer} onClose={() => setDrawer(false)} />
    </>
  );
}

function Drawer({ open, onClose }: { open: boolean; onClose: () => void }) {
  const s = useStore();
  const install = useInstall();
  const items: [string, string, string][] = [
    ["/", "Home", "home"],
    ["/menu", "Menu", "menu"],
    ["/menu?c=deals", "Hungry Deals", "tag"],
    ["/rewards", "Hungry Rewards", "star"],
    ["/account?tab=orders", "Track my order", "bike"],
    ["/account", "My account", "user"],
    ["/store", "Store info & hours", "store"],
    ["/help", "Help & FAQ", "info"],
  ];
  return (
    <div className={`fixed inset-0 z-[70] ${open ? "" : "pointer-events-none"}`} aria-hidden={!open}>
      <div className={`absolute inset-0 bg-char/50 transition-opacity ${open ? "opacity-100" : "opacity-0"}`} onClick={onClose} />
      <nav className={`absolute left-0 top-0 flex h-full w-[86%] max-w-sm flex-col bg-white shadow-2xl transition-transform duration-300 ${open ? "translate-x-0" : "-translate-x-full"}`} aria-label="Main">
        <div className="flex items-center justify-between border-b border-char-100 p-4">
          <span className="font-display text-2xl text-tomato">HUNGRY<span className="text-char">BAR</span></span>
          <button onClick={onClose} className="grid h-10 w-10 place-items-center rounded-full hover:bg-char-50" aria-label="Close menu">
            <Icon name="close" />
          </button>
        </div>
        <div className="border-b border-char-100 bg-char p-4 text-white">
          {s.me ? (
            <>
              <p className="text-sm text-white/70">Hi {s.me.name || "there"} 👋</p>
              <p className="mt-1 font-condensed text-3xl">{s.me.points.toLocaleString()} <span className="text-base text-mustard">{s.config.rewards.pointName}</span></p>
            </>
          ) : (
            <>
              <RewardsMark light className="text-xl" />
              <p className="mt-2 text-sm text-white/80">Earn 1 point for every Rs. {s.config.rewards.rupeesPerPoint}. Spend them on free food.</p>
              <button onClick={() => { onClose(); s.openLogin(); }} className="btn-mustard btn-sm mt-3">Login / Register</button>
            </>
          )}
        </div>
        <div className="flex-1 overflow-y-auto p-2">
          {items.map(([href, label, icon]) => (
            <Link key={href} href={href} className="flex items-center gap-3 rounded-xl px-3 py-3 font-bold hover:bg-char-50">
              <Icon name={icon} className="h-5 w-5 text-tomato" />
              {label}
            </Link>
          ))}
          {install.canShow && (
            <button onClick={install.prompt} className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left font-bold hover:bg-char-50">
              <Icon name="download" className="h-5 w-5 text-tomato" />
              Install the app
            </button>
          )}
          {s.me && (
            <button onClick={() => { void s.logout(); onClose(); }} className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left font-bold text-char-500 hover:bg-char-50">
              <Icon name="logout" className="h-5 w-5" />
              Log out
            </button>
          )}
        </div>
        <div className="border-t border-char-100 p-4 text-sm text-char-500">
          <p className="font-bold text-char">Open daily {fmtTime12(s.config.hours.open)} – {fmtTime12(s.config.hours.close)}</p>
          <p>{s.config.shop.address}</p>
          <p className="mt-1 select-all font-bold text-char">{s.config.shop.phone}</p>
        </div>
      </nav>
    </div>
  );
}

export function MobileNav() {
  const s = useStore();
  const path = usePathname();
  const tabs: [string, string, string][] = [
    ["/", "Home", "home"],
    ["/menu", "Menu", "menu"],
    ["/menu?c=deals", "Deals", "tag"],
    ["/rewards", "Rewards", "star"],
  ];
  return (
    <nav className="fixed inset-x-0 bottom-0 z-50 border-t border-char-100 bg-white/95 backdrop-blur safe-bottom md:hidden" aria-label="Quick">
      <div className="grid h-[62px] grid-cols-5">
        {tabs.map(([href, label, icon]) => {
          const active = href === "/" ? path === "/" : path.startsWith(href.split("?")[0]) && (href.includes("deals") ? false : true);
          return (
            <Link key={label} href={href} className={`flex flex-col items-center justify-center gap-0.5 text-[11px] font-bold ${active ? "text-tomato" : "text-char-500"}`}>
              <Icon name={icon} className="h-[22px] w-[22px]" />
              {label}
            </Link>
          );
        })}
        <button onClick={() => s.setCartOpen(true)} className="relative flex flex-col items-center justify-center gap-0.5 text-[11px] font-bold text-char-500">
          <Icon name="bag" className="h-[22px] w-[22px]" />
          Cart
          {s.count > 0 && <span className="absolute right-[22%] top-1.5 grid h-5 min-w-5 place-items-center rounded-full bg-tomato px-1 text-[11px] text-white">{s.count}</span>}
        </button>
      </div>
    </nav>
  );
}

export function Footer() {
  const s = useStore();
  const cats = s.catalog.categories;
  return (
    <footer className="mt-16 bg-char pb-24 text-white md:pb-0">
      <div className="mx-auto grid grid-cols-1 max-w-6xl gap-10 px-6 py-14 sm:grid-cols-2 md:grid-cols-4">
        <div>
          <h3 className="font-condensed text-2xl text-mustard">Menu</h3>
          <ul className="mt-3 space-y-2 text-sm font-bold text-white/85">
            {cats.slice(0, 6).map((c) => (
              <li key={c.id}><Link href={`/menu?c=${c.slug}`} className="hover:text-white hover:underline">{c.name}</Link></li>
            ))}
          </ul>
        </div>
        <div>
          <h3 className="font-condensed text-2xl text-mustard">Our Food</h3>
          <ul className="mt-3 space-y-2 text-sm font-bold text-white/85">
            <li><Link href="/help#halal" className="hover:underline">100% Halal</Link></li>
            <li><Link href="/help#ingredients" className="hover:underline">Ingredients</Link></li>
            <li><Link href="/help#allergens" className="hover:underline">Allergen information</Link></li>
          </ul>
        </div>
        <div>
          <h3 className="font-condensed text-2xl text-mustard">Help</h3>
          <ul className="mt-3 space-y-2 text-sm font-bold text-white/85">
            <li><Link href="/help#contact" className="hover:underline">Contact us</Link></li>
            <li><Link href="/help" className="hover:underline">FAQ</Link></li>
            <li><Link href="/store" className="hover:underline">Store info & delivery areas</Link></li>
            <li><Link href="/about" className="hover:underline">About us</Link></li>
            <li><Link href="/terms" className="hover:underline">Terms & conditions</Link></li>
            <li><Link href="/privacy" className="hover:underline">Privacy policy</Link></li>
          </ul>
        </div>
        <div>
          <h3 className="font-condensed text-2xl text-mustard">Visit us</h3>
          <p className="mt-3 text-sm text-white/85">{s.config.shop.address}</p>
          <p className="text-sm text-white/85">Open daily {fmtTime12(s.config.hours.open)} – {fmtTime12(s.config.hours.close)}</p>
          <p className="mt-2 select-all text-sm font-bold">{s.config.shop.phone}</p>
          {s.config.shop.instagram && <a href={`https://instagram.com/${s.config.shop.instagram}`} target="_blank" rel="noreferrer" className="mt-2 inline-block text-sm font-bold underline">Instagram @{s.config.shop.instagram}</a>}
        </div>
      </div>
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 border-t border-white/10 px-6 py-8">
        <p className="font-condensed text-3xl md:text-4xl">Fresh. Hot. Hand-tossed.</p>
        <span className="font-display text-3xl text-tomato">HUNGRY<span className="text-white">BAR</span></span>
      </div>
      <p className="pb-6 text-center text-xs text-white/40">© {new Date().getFullYear()} Hungry Bar · Est. {s.config.shop.since} · 100% Halal · Dehiwala, Sri Lanka · <Link href="/staff/login" className="hover:underline">Staff</Link></p>
    </footer>
  );
}

export function Toast() {
  const s = useStore();
  if (!s.toast) return null;
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-24 z-[90] flex justify-center md:bottom-8">
      <div className="flex items-center gap-2 rounded-full bg-char px-5 py-3 text-sm font-bold text-white shadow-2xl animate-[sheetUp_.2s_ease-out]">
        <Icon name="check" className="h-4 w-4 text-mustard" /> {s.toast}
      </div>
    </div>
  );
}
