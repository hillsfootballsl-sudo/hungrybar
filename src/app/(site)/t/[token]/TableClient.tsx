"use client";
import Link from "next/link";
import { useEffect } from "react";
import { useCart } from "@/components/cart";

export function TableClient({ token, label }: { token: string; label: string }) {
  const cart = useCart();
  useEffect(() => {
    if (cart.ready) cart.setTable(token, label);
  }, [cart.ready, token, label]); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <div className="grain mx-auto max-w-md px-4 py-16 text-center">
      <p className="font-bold uppercase tracking-[.3em] text-tomato">Welcome to Hungry Bar</p>
      <h1 className="h-display mt-2 text-7xl">Table {label}</h1>
      <p className="mt-4 text-lg text-char-500">Order from your phone — it goes straight to our kitchen. Pay at the counter or by card.</p>
      <div className="mt-8 grid gap-3">
        <Link href="/build" className="btn-primary text-lg">🍕 Build a pizza</Link>
        <Link href="/menu" className="btn-ghost text-lg">Browse the menu</Link>
      </div>
    </div>
  );
}
