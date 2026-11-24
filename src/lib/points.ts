// Hungry Points ledger. Positive batches carry `remaining` and an expiry; spending consumes the
// oldest unexpired batches first (FIFO). Customer.points caches the live balance.
import type { PointsReason, Prisma, PrismaClient } from "@prisma/client";
import { db } from "./db";
import { getSetting, type RewardsSettings } from "./settings";
import { colomboParts } from "./time";

type Tx = PrismaClient | Prisma.TransactionClient;

const addMonths = (d: Date, m: number) => {
  const x = new Date(d);
  x.setMonth(x.getMonth() + m);
  return x;
};

async function refresh(tx: Tx, customerId: string) {
  const agg = await tx.pointsTxn.aggregate({ where: { customerId, remaining: { gt: 0 }, OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }] }, _sum: { remaining: true } });
  const points = agg._sum.remaining ?? 0;
  await tx.customer.update({ where: { id: customerId }, data: { points } });
  return points;
}

/** Expire old batches for one customer and return the live balance */
export async function balance(tx: Tx, customerId: string) {
  const now = new Date();
  const old = await tx.pointsTxn.findMany({ where: { customerId, remaining: { gt: 0 }, expiresAt: { lte: now } } });
  for (const b of old) {
    await tx.pointsTxn.update({ where: { id: b.id }, data: { remaining: 0 } });
    await tx.pointsTxn.create({ data: { customerId, change: -b.remaining, reason: "EXPIRE", note: "Points expired" } });
  }
  return refresh(tx, customerId);
}

export async function credit(tx: Tx, customerId: string, amount: number, reason: PointsReason, opts: { note?: string; orderId?: string; validDays?: number } = {}) {
  const amt = Math.floor(amount);
  if (amt <= 0) return 0;
  const cfg = await getSetting("rewards");
  const expiresAt = opts.validDays ? new Date(Date.now() + opts.validDays * 86400000) : addMonths(new Date(), cfg.expiryMonths);
  await tx.pointsTxn.create({ data: { customerId, change: amt, remaining: amt, reason, note: opts.note ?? null, orderId: opts.orderId ?? null, expiresAt } });
  return refresh(tx, customerId);
}

export class PointsError extends Error {}

/** Spend points FIFO. Throws if the balance is too low unless `partial` (then spends what's there). */
export async function debit(tx: Tx, customerId: string, amount: number, reason: PointsReason, opts: { note?: string; orderId?: string; partial?: boolean } = {}) {
  let need = Math.floor(amount);
  if (need <= 0) return 0;
  const bal = await balance(tx, customerId);
  if (bal < need) {
    if (!opts.partial) throw new PointsError(`Not enough points (you have ${bal}, need ${need})`);
    need = bal;
  }
  if (need <= 0) return 0;
  const batches = await tx.pointsTxn.findMany({
    where: { customerId, remaining: { gt: 0 }, OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }] },
    orderBy: [{ expiresAt: "asc" }, { createdAt: "asc" }],
  });
  let left = need;
  for (const b of batches) {
    if (left <= 0) break;
    const take = Math.min(b.remaining, left);
    await tx.pointsTxn.update({ where: { id: b.id }, data: { remaining: b.remaining - take } });
    left -= take;
  }
  await tx.pointsTxn.create({ data: { customerId, change: -need, reason, note: opts.note ?? null, orderId: opts.orderId ?? null } });
  await refresh(tx, customerId);
  return need;
}

/** Birthday / anniversary bonus, credited once a year when the date is coming up */
export async function celebrationBonuses(customerId?: string, cfgIn?: RewardsSettings) {
  const cfg = cfgIn ?? (await getSetting("rewards"));
  if (!cfg.enabled) return 0;
  const now = colomboParts();
  const upcoming = new Set<string>();
  for (let i = 0; i <= cfg.bonusDaysBefore; i++) {
    const d = new Date(Date.UTC(now.y, now.m - 1, now.d + i));
    upcoming.add(`${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(d.getUTCDate()).padStart(2, "0")}`);
  }
  const list = await db.customer.findMany({
    where: { ...(customerId ? { id: customerId } : {}), OR: [{ birthday: { in: [...upcoming] } }, { anniversary: { in: [...upcoming] } }], NOT: { lastBirthdayBonusYear: now.y } },
  });
  let n = 0;
  for (const c of list) {
    await db.$transaction(async (tx) => {
      if (c.birthday && upcoming.has(c.birthday) && cfg.birthdayBonus > 0) await credit(tx, c.id, cfg.birthdayBonus, "BIRTHDAY", { note: "Happy birthday from Hungry Bar!", validDays: cfg.bonusValidDays });
      else if (c.anniversary && upcoming.has(c.anniversary) && cfg.anniversaryBonus > 0) await credit(tx, c.id, cfg.anniversaryBonus, "BIRTHDAY", { note: "Happy anniversary from Hungry Bar!", validDays: cfg.bonusValidDays });
      await tx.customer.update({ where: { id: c.id }, data: { lastBirthdayBonusYear: now.y } });
    });
    n++;
  }
  return n;
}

/** Nightly housekeeping: expire batches for everyone who has some due */
export async function expireAll() {
  const due = await db.pointsTxn.findMany({ where: { remaining: { gt: 0 }, expiresAt: { lte: new Date() } }, select: { customerId: true }, distinct: ["customerId"] });
  for (const d of due) await balance(db, d.customerId);
  return due.length;
}
