// Sector allocation reporting
import { db } from "./db";
import { addDays, colomboDateKey, startOfColomboDay } from "./time";

export const SECTORS = [
  { key: "FOOD", label: "Food cost", field: "foodCost", color: "#2a78d6", hint: "Ingredients used, at cost" },
  { key: "PACKAGING", label: "Packaging", field: "packagingCost", color: "#eb6834", hint: "Boxes, bags, cups" },
  { key: "ROYALTY", label: "Royalty", field: "royalty", color: "#1baf7a", hint: "Fixed per pizza size" },
  { key: "CHARITY", label: "Charity", field: "charity", color: "#eda100", hint: "Fixed per pizza size" },
  { key: "DELIVERY", label: "Delivery fees", field: "deliveryFee", color: "#e87ba4", hint: "Collected for riders" },
  { key: "PLATFORM", label: "Uber/PickMe fee", field: "platformFee", color: "#008300", hint: "Commission kept by apps" },
  { key: "PROFIT", label: "Profit", field: "profit", color: "#6250d6", hint: "What's left after everything" },
] as const;
export type SectorKey = (typeof SECTORS)[number]["key"];

export interface DayRow {
  day: string;
  orders: number;
  revenue: number;
  sectors: Record<SectorKey, number>;
}

/** Per-day sector totals for non-cancelled orders in [from, to] (YYYY-MM-DD, Colombo) */
export async function sectorsByDay(from: string, to: string): Promise<DayRow[]> {
  const rows = await db.$queryRaw<
    { day: string; orders: bigint; revenue: number; food: number; pack: number; royalty: number; charity: number; delivery: number; platform: number; profit: number }[]
  >`
    SELECT to_char(("createdAt" AT TIME ZONE 'UTC') AT TIME ZONE 'Asia/Colombo', 'YYYY-MM-DD') AS day,
      COUNT(*) AS orders, SUM(total) AS revenue, SUM("foodCost") AS food, SUM("packagingCost") AS pack,
      SUM(royalty) AS royalty, SUM(charity) AS charity, SUM("deliveryFee") AS delivery, SUM("platformFee") AS platform, SUM(profit) AS profit
    FROM "Order"
    WHERE status <> 'CANCELLED' AND "createdAt" >= ${startOfColomboDay(from)} AND "createdAt" < ${startOfColomboDay(addDays(to, 1))}
    GROUP BY 1 ORDER BY 1`;
  const map = new Map(rows.map((r) => [r.day, r]));
  const out: DayRow[] = [];
  for (let d = from; d <= to; d = addDays(d, 1)) {
    const r = map.get(d);
    out.push({
      day: d,
      orders: Number(r?.orders ?? 0),
      revenue: Number(r?.revenue ?? 0),
      sectors: {
        FOOD: Number(r?.food ?? 0),
        PACKAGING: Number(r?.pack ?? 0),
        ROYALTY: Number(r?.royalty ?? 0),
        CHARITY: Number(r?.charity ?? 0),
        DELIVERY: Number(r?.delivery ?? 0),
        PLATFORM: Number(r?.platform ?? 0),
        PROFIT: Number(r?.profit ?? 0),
      },
    });
    if (out.length > 400) break;
  }
  return out;
}

/** All-time collected vs paid-out per sector (the "envelope" balances) */
export async function sectorBalances() {
  const [tot, paid] = await Promise.all([
    db.order.aggregate({
      where: { status: { not: "CANCELLED" } },
      _sum: { foodCost: true, packagingCost: true, royalty: true, charity: true, deliveryFee: true, platformFee: true, profit: true },
    }),
    db.sectorEntry.groupBy({ by: ["sector"], _sum: { amount: true } }),
  ]);
  const s = tot._sum;
  const collected: Record<SectorKey, number> = {
    FOOD: s.foodCost ?? 0,
    PACKAGING: s.packagingCost ?? 0,
    ROYALTY: s.royalty ?? 0,
    CHARITY: s.charity ?? 0,
    DELIVERY: s.deliveryFee ?? 0,
    PLATFORM: s.platformFee ?? 0,
    PROFIT: s.profit ?? 0,
  };
  const out = Object.fromEntries(paid.map((p) => [p.sector, p._sum.amount ?? 0])) as Record<string, number>;
  return SECTORS.map((x) => ({ ...x, collected: collected[x.key], paidOut: out[x.key] ?? 0, balance: collected[x.key] - (out[x.key] ?? 0) }));
}

export function todayKey() {
  return colomboDateKey();
}
