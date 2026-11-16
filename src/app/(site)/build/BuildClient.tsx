"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { PizzaBuilder } from "@/components/builder/PizzaBuilder";
import { useCart } from "@/components/cart";
import { useCatalog } from "@/components/CatalogContext";
import { PizzaArt } from "@/components/PizzaArt";
import type { CartLine } from "@/lib/types";

export function BuildClient({ product: productParam, size, edit }: { product?: string; size?: string; edit?: string }) {
  const cat = useCatalog();
  const cart = useCart();
  const router = useRouter();
  const [added, setAdded] = useState<Omit<CartLine, "key"> | null>(null);
  const [round, setRound] = useState(0);

  if (!cart.ready) return <div className="h-[70vh]" />;

  const editing = edit ? cart.lines.find((l) => l.key === edit) : undefined;
  const product = cat.products.find((p) => p.kind === "PIZZA" && (p.slug === productParam || p.id === productParam));
  const sizeId = cat.sizes.find((s) => s.id === size || s.short.toLowerCase() === size?.toLowerCase())?.id;

  const initial = editing
    ? { productId: editing.productId, sizeId: editing.sizeId, crustId: editing.crustId, toppings: editing.toppings, quantity: editing.quantity, note: editing.note }
    : { productId: product?.id, sizeId: sizeId && product?.variants.some((v) => v.sizeId === sizeId) ? sizeId : undefined };

  return (
    <>
      {product && !editing && (
        <div className="mx-auto mb-4 max-w-7xl px-4">
          <Link href="/build" className="text-sm font-bold text-char-500 hover:text-tomato">← or start from scratch</Link>
        </div>
      )}
      <PizzaBuilder
        key={(editing?.key ?? "") + (product?.id ?? "custom") + round}
        catalog={cat}
        initial={initial}
        confirmLabel={editing ? "Update" : "Add to order"}
        onConfirm={(line) => {
          if (editing) {
            cart.replace(editing.key, line);
            cart.setOpen(true);
            router.push("/menu");
          } else {
            cart.add(line);
            setAdded(line);
          }
        }}
      />
      {added && (
        <div className="fixed inset-0 z-[70] grid place-items-center bg-char/70 p-4 backdrop-blur-sm" onClick={() => setAdded(null)}>
          <div className="card w-full max-w-sm animate-drop p-6 text-center" onClick={(e) => e.stopPropagation()}>
            <div className="mx-auto h-40 w-40">
              <PizzaArt catalog={cat} sizeId={added.sizeId} crustId={added.crustId} toppings={added.toppings ?? {}} board={false} sliced steam className="h-full w-full" />
            </div>
            <p className="h-display mt-2 text-3xl">In the box!</p>
            <p className="text-char-500">Your pizza has been added to your order.</p>
            <div className="mt-5 grid gap-3">
              <Link href="/checkout" className="btn-primary text-lg">Checkout →</Link>
              <button className="btn-ghost" onClick={() => { setAdded(null); router.push("/menu"); }}>Add drinks & sides</button>
              <button className="text-sm font-bold text-char-500 underline" onClick={() => { setAdded(null); setRound((r) => r + 1); window.scrollTo({ top: 0 }); }}>Build another pizza</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
