import type { Metadata } from "next";
import { RewardsClient } from "@/components/store/RewardsClient";

export const metadata: Metadata = { title: "Hungry Rewards", description: "Earn Hungry Points on every Hungry Bar order and swap them for free garlic bread, mojitos, subs and pizzas." };

export default function RewardsPage() {
  return <RewardsClient />;
}
