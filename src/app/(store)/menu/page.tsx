import type { Metadata } from "next";
import { MenuClient } from "@/components/store/MenuClient";

export const metadata: Metadata = { title: "Menu", description: "Pizzas, Detroit squares, subs & sandwiches, lasagna, fresh juices, mojitos and combo deals at Hungry Bar, Dehiwala." };

export default async function MenuPage({ searchParams }: { searchParams: Promise<{ c?: string; build?: string; q?: string }> }) {
  const sp = await searchParams;
  return <MenuClient initialCat={sp.c} build={sp.build === "1"} q={sp.q} />;
}
