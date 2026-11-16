import type { Metadata } from "next";
import { MenuClient } from "./MenuClient";

export const metadata: Metadata = { title: "Menu", description: "Original pizzas, Detroit style squares, lasagna, paninis, fresh juices and mojitos — Hungry Bar, Dehiwala." };

export default function MenuPage() {
  return <MenuClient />;
}
