"use client";
import Link from "next/link";
import { useEffect } from "react";
import { useStore } from "./StoreProvider";

export function TableStart({ token, label }: { token: string; label: string }) {
  const s = useStore();
  useEffect(() => {
    if (s.ready) s.setMode({ type: "DINE_IN", tableToken: token, tableLabel: label, when: "ASAP" });
  }, [s.ready]); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <div className="mx-auto max-w-md px-5 py-16 text-center">
      <p className="text-sm font-bold uppercase tracking-[.3em] text-tomato">Welcome to Hungry Bar</p>
      <h1 className="mt-2 font-condensed text-7xl">Table {label}</h1>
      <p className="mt-3 text-lg text-char-500">Order from your phone and it goes straight to our kitchen. Pay at the table or by card.</p>
      <div className="mt-8 grid gap-3">
        <Link href="/menu" className="btn-primary h-14 text-lg">See the menu</Link>
        <Link href="/menu?build=1" className="btn-ghost h-14 text-lg">Build your own pizza</Link>
      </div>
    </div>
  );
}
