"use client";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { fmtDateTime } from "@/lib/time";

const NAV = [
  { href: "/admin", label: "Dashboard", icon: "📊" },
  { href: "/admin/orders", label: "Orders", icon: "🧾" },
  { href: "/admin/sectors", label: "Sectors & money", icon: "💰" },
  { href: "/admin/inventory", label: "Stock", icon: "📦" },
  { href: "/admin/purchases", label: "Purchases & suppliers", icon: "🚚" },
  { href: "/admin/menu", label: "Menu", icon: "🍕" },
  { href: "/admin/builder", label: "Pizza builder & recipes", icon: "🧪" },
  { href: "/admin/customers", label: "Customers & rewards", icon: "⭐" },
  { href: "/admin/promos", label: "Promo codes", icon: "🏷️" },
  { href: "/admin/banners", label: "Homepage banners", icon: "🖼️" },
  { href: "/admin/delivery", label: "Delivery & tables", icon: "🛵" },
  { href: "/admin/staff", label: "Staff & shifts", icon: "👥" },
  { href: "/admin/receipt", label: "Receipt designer", icon: "🖨️" },
  { href: "/admin/settings", label: "Settings", icon: "⚙️" },
];

type N = { id: string; type: string; title: string; body: string | null; link: string | null; read: boolean; createdAt: string };

export function AdminNav({ name }: { name: string }) {
  const path = usePathname();
  const [open, setOpen] = useState(false);
  const [bell, setBell] = useState(false);
  const [notes, setNotes] = useState<{ items: N[]; unread: number }>({ items: [], unread: 0 });
  const load = useCallback(async () => {
    const r = await fetch("/api/staff/notifications");
    if (r.ok) setNotes(await r.json());
  }, []);
  useEffect(() => {
    void load();
    const t = setInterval(load, 20000);
    return () => clearInterval(t);
  }, [load]);
  useEffect(() => setOpen(false), [path]);

  const links = (
    <nav className="flex flex-col gap-0.5">
      {NAV.map((n) => {
        const active = n.href === "/admin" ? path === "/admin" : path.startsWith(n.href);
        return (
          <Link key={n.href} href={n.href} className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-bold ${active ? "bg-tomato text-white" : "text-cream/80 hover:bg-white/10"}`}>
            <span>{n.icon}</span>
            {n.label}
          </Link>
        );
      })}
      <div className="my-3 border-t border-white/10" />
      <Link href="/pos" className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-bold text-cream/80 hover:bg-white/10">🖥️ Open POS</Link>
      <Link href="/kitchen" className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-bold text-cream/80 hover:bg-white/10">🔥 Kitchen screen</Link>
      <Link href="/" target="_blank" className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-bold text-cream/80 hover:bg-white/10">🌐 View website</Link>
    </nav>
  );

  return (
    <>
      <aside className="hidden w-60 shrink-0 flex-col bg-char p-3 text-cream lg:flex">
        <Link href="/admin" className="mb-4 flex items-center gap-2 px-2">
          <Image src="/brand/logo.png" alt="" width={44} height={44} />
          <span className="font-display uppercase leading-none">Hungry Bar<span className="block text-xs tracking-[.3em] text-cream/50">Admin</span></span>
        </Link>
        <div className="no-scrollbar flex-1 overflow-y-auto">{links}</div>
      </aside>
      <header className="fixed inset-x-0 top-0 z-40 flex h-14 items-center gap-3 border-b border-char-100 bg-white px-4 lg:left-60">
        <button className="lg:hidden" onClick={() => setOpen(true)} aria-label="Menu">☰</button>
        <span className="font-bold lg:hidden">Hungry Bar Admin</span>
        <div className="ml-auto flex items-center gap-3">
          <div className="relative">
            <button
              onClick={async () => {
                setBell((b) => !b);
                if (notes.unread) {
                  await fetch("/api/staff/notifications", { method: "POST" });
                  setNotes((n) => ({ ...n, unread: 0 }));
                }
              }}
              className="relative rounded-full p-2 hover:bg-char-50"
              aria-label="Notifications"
            >
              🔔
              {notes.unread > 0 && <span className="absolute -right-0.5 -top-0.5 grid h-5 min-w-5 place-items-center rounded-full bg-tomato px-1 text-[11px] font-bold text-white">{notes.unread}</span>}
            </button>
            {bell && (
              <div className="absolute right-0 top-11 z-50 max-h-[70vh] w-80 overflow-y-auto rounded-xl border border-char-100 bg-white shadow-2xl">
                {notes.items.length === 0 && <p className="p-4 text-sm text-char-400">No notifications</p>}
                {notes.items.map((n) => (
                  <Link key={n.id} href={n.link ?? "#"} onClick={() => setBell(false)} className={`block border-b border-char-50 p-3 text-sm hover:bg-cream-100 ${n.read ? "" : "bg-tomato-50"}`}>
                    <p className="font-bold">{n.type === "LOW_STOCK" ? "⚠️ " : n.type === "NEW_ORDER" ? "🔔 " : n.type === "PAYMENT" ? "💳 " : "ℹ️ "}{n.title}</p>
                    {n.body && <p className="text-char-500">{n.body}</p>}
                    <p className="text-xs text-char-300">{fmtDateTime(n.createdAt)}</p>
                  </Link>
                ))}
              </div>
            )}
          </div>
          <span className="text-sm text-char-500">{name}</span>
          <button onClick={async () => { await fetch("/api/staff/logout", { method: "POST" }); window.location.href = "/staff/login"; }} className="text-sm font-bold text-char-400 hover:text-tomato">Log out</button>
        </div>
      </header>
      {open && (
        <div className="fixed inset-0 z-50 bg-char/60 lg:hidden" onClick={() => setOpen(false)}>
          <div className="h-full w-64 overflow-y-auto bg-char p-3" onClick={(e) => e.stopPropagation()}>{links}</div>
        </div>
      )}
    </>
  );
}
