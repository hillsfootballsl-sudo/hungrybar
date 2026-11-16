import type { Metadata } from "next";
import { BuildClient } from "./BuildClient";

export const metadata: Metadata = { title: "Build Your Pizza", description: "Pick a size, base, sauce, cheese and toppings — and watch your Hungry Bar pizza come to life." };

export default async function BuildPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams;
  return (
    <div className="grain bg-cream-100 pt-4 md:pt-8">
      <BuildClient product={sp.product} size={sp.size} edit={sp.edit} />
    </div>
  );
}
