import type { Metadata } from "next";
import { db } from "@/lib/db";
import { payhereConfigured } from "@/lib/payhere";
import { getSetting } from "@/lib/settings";
import { CheckoutClient } from "./CheckoutClient";

export const metadata: Metadata = { title: "Checkout" };

export default async function CheckoutPage() {
  const [zones, orders] = await Promise.all([db.deliveryZone.findMany({ where: { active: true }, orderBy: { sortOrder: "asc" } }), getSetting("orders")]);
  return (
    <CheckoutClient
      zones={zones.map((z) => ({ id: z.id, name: z.name, fee: z.fee, eta: z.etaMinutes }))}
      payhere={payhereConfigured()}
      accepting={orders.acceptingOnline}
      prepMinutes={orders.prepMinutes}
    />
  );
}
