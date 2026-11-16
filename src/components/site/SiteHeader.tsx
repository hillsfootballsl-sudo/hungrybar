"use client";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCart } from "@/components/cart";
import { type Hours, OpenStatus } from "./OpenStatus";

const NAV = [
  { href: "/menu", label: "Menu" },
  { href: "/build", label: "Build a Pizza" },
  { href: "/#rewards", label: "Rewards" },
  { href: "/account", label: "My Orders" },
];

function CartButton({ className = "", size = 26 }: { className?: string; size?: number }) {
  const cart = useCart();
  return (
    <button onClick={() => cart.setOpen(true)} className={`relative ${className}`} aria-label={`Cart, ${cart.count} items`}>
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 7h18l-2 12H5L3 7z" />
        <path d="M8 7a4 4 0 0 1 8 0" />
      </svg>
      {cart.count > 0 && (
        <span key={cart.bump} className="absolute -right-2 -top-2 grid h-6 min-w-6 animate-pop place-items-center rounded-full border-2 border-char bg-tomato px-1 text-xs font-bold text-white">
          {cart.count}
        </span>
      )}
    </button>
  );
}

export function SiteHeader({ hours }: { hours: Hours }) {
  const path = usePathname();
  return (
    <>
      <header className="sticky top-0 z-50 border-b-2 border-char bg-cream-100/90 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-7xl items-center gap-4 px-4">
          <Link href="/" className="flex items-center gap-2">
            <Image src="/brand/logo.png" alt="Hungry Bar" width={52} height={52} className="h-12 w-12 -my-1 transition hover:rotate-[-8deg]" priority />
            <span className="hidden font-display text-xl uppercase leading-none sm:block">
              Hungry<span className="text-tomato">Bar</span>
            </span>
          </Link>
          <nav className="ml-6 hidden items-center gap-1 md:flex">
            {NAV.map((n) => (
              <Link key={n.href} href={n.href} className={`rounded-lg px-3 py-2 font-bold transition hover:bg-char hover:text-cream ${path === n.href ? "bg-char text-cream" : ""}`}>
                {n.label}
              </Link>
            ))}
          </nav>
          <div className="ml-auto flex items-center gap-4">
            <div className="hidden sm:block">
              <OpenStatus hours={hours} />
            </div>
            <div className="sm:hidden">
              <OpenStatus hours={hours} compact />
            </div>
            <Link href="/build" className="btn-primary btn-sm hidden md:inline-flex">Order now</Link>
            <CartButton className="hidden md:block" />
          </div>
        </div>
      </header>
      {/* app-style bottom bar on phones */}
      <nav className="fixed inset-x-0 bottom-0 z-50 border-t-2 border-char bg-char pb-[env(safe-area-inset-bottom)] text-cream md:hidden">
        <div className="grid grid-cols-4">
          {[
            { href: "/", label: "Home", icon: "M3 11l9-7 9 7v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z" },
            { href: "/menu", label: "Menu", icon: "M4 6h16M4 12h16M4 18h10" },
            { href: "/build", label: "Build", icon: "M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zm0 3v7l5 3" },
          ].map((n) => (
            <Link key={n.href} href={n.href} className={`flex flex-col items-center gap-0.5 py-2 text-[11px] font-bold uppercase ${path === n.href ? "text-tomato-300" : ""}`}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d={n.icon} /></svg>
              {n.label}
            </Link>
          ))}
          <div className="flex flex-col items-center gap-0.5 py-2 text-[11px] font-bold uppercase">
            <CartButton size={22} />
            <span>Cart</span>
          </div>
        </div>
      </nav>
    </>
  );
}
