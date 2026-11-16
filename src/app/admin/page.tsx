import Link from "next/link";
import { BarChart, StackedBars } from "@/components/admin/Charts";
import { Badge, Card, lkr, PageHeader, Stat, Table } from "@/components/admin/ui";
import { db } from "@/lib/db";
import { SECTORS, sectorsByDay } from "@/lib/sectors";
import { addDays, colomboDateKey, fmtClock, startOfColomboDay } from "@/lib/time";

export const metadata = { title: "Dashboard" };

export default async function Dashboard() {
  const today = colomboDateKey();
  const from = addDays(today, -13);
  const [days, low, live, top, openShift, unread] = await Promise.all([
    sectorsByDay(from, today),
    db.$queryRaw<{ id: string; name: string; stock: number; lowStock: number; unit: string }[]>`SELECT id, name, stock, "lowStock", unit FROM "Ingredient" WHERE active AND "lowStock" > 0 AND stock <= "lowStock" * 1.2 ORDER BY stock / NULLIF("lowStock",0) ASC LIMIT 8`,
    db.order.groupBy({ by: ["status"], where: { status: { in: ["PENDING", "CONFIRMED", "PREPARING", "READY", "OUT_FOR_DELIVERY"] } }, _count: true }),
    db.orderItem.groupBy({ by: ["name", "sizeName"], where: { order: { status: { not: "CANCELLED" }, createdAt: { gte: startOfColomboDay(addDays(today, -6)) } } }, _sum: { quantity: true, lineTotal: true }, orderBy: { _sum: { quantity: "desc" } }, take: 8 }),
    db.shift.findFirst({ where: { closedAt: null }, include: { staff: { select: { name: true } } } }),
    db.order.findMany({ where: { paymentStatus: "UNPAID", status: { notIn: ["CANCELLED", "PENDING"] }, channel: { notIn: ["UBER", "PICKME"] } }, select: { id: true, number: true, total: true, createdAt: true }, take: 5 }),
  ]);
  const t = days[days.length - 1];
  const y = days[days.length - 2];
  const week = days.slice(-7);
  const weekRev = week.reduce((s, d) => s + d.revenue, 0);
  const prevWeekRev = days.slice(0, 7).reduce((s, d) => s + d.revenue, 0);
  const delta = (a: number, b: number) => (b ? `${a >= b ? "▲" : "▼"} ${Math.abs(Math.round(((a - b) / b) * 100))}% vs ${b === y.revenue ? "yesterday" : "last week"}` : "—");
  const liveCount = live.reduce((s, l) => s + l._count, 0);
  const pending = live.find((l) => l.status === "PENDING")?._count ?? 0;

  return (
    <div>
      <PageHeader
        title="Today at Hungry Bar"
        sub={openShift ? `Shift open by ${openShift.staff.name} since ${fmtClock(openShift.openedAt)}` : "No shift open — open one from the POS"}
        actions={<Link href="/pos" className="btn-primary">Open POS</Link>}
      />
      {pending > 0 && (
        <Link href="/pos" className="mb-4 flex items-center justify-between rounded-xl bg-tomato p-4 font-bold text-white">
          🔔 {pending} online order{pending > 1 ? "s" : ""} waiting to be accepted <span>Go to POS →</span>
        </Link>
      )}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat label="Sales today" value={lkr(t.revenue)} sub={delta(t.revenue, y.revenue)} tone={t.revenue >= y.revenue ? "good" : "bad"} />
        <Stat label="Orders today" value={t.orders} sub={`avg ${lkr(t.orders ? t.revenue / t.orders : 0)}`} />
        <Stat label="Profit today" value={lkr(t.sectors.PROFIT)} sub={t.revenue ? `${Math.round((t.sectors.PROFIT / t.revenue) * 100)}% margin` : "—"} />
        <Stat label="Live orders" value={liveCount} sub={`${pending} waiting · last 7 days ${lkr(weekRev)}`} tone={weekRev >= prevWeekRev ? "good" : "bad"} />
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-[1.4fr_1fr]">
        <Card title="Sales · last 14 days">
          <BarChart label="Sales per day" data={days.map((d) => ({ x: d.day, y: d.revenue, sub: `${d.orders} orders` }))} />
        </Card>
        <Card title="Today's money — where it goes" actions={<Link href="/admin/sectors" className="text-sm font-bold text-tomato">Details →</Link>}>
          <div className="mb-3 flex h-4 overflow-hidden rounded-full bg-char-50">
            {SECTORS.map((s) => {
              const v = Math.max(0, t.sectors[s.key]);
              return t.revenue > 0 && v > 0 ? <div key={s.key} title={`${s.label}: ${lkr(v)}`} style={{ width: `${(v / t.revenue) * 100}%`, background: s.color }} className="border-r-2 border-white last:border-0" /> : null;
            })}
          </div>
          <ul className="space-y-1.5 text-sm">
            {SECTORS.map((s) => (
              <li key={s.key} className="flex items-center justify-between">
                <span className="flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-sm" style={{ background: s.color }} />{s.label}</span>
                <span className="font-bold">{lkr(t.sectors[s.key])}</span>
              </li>
            ))}
          </ul>
        </Card>
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-3">
        <Card title="Sector split · last 14 days" className="xl:col-span-2">
          <StackedBars days={days.map((d) => ({ x: d.day, values: d.sectors }))} series={SECTORS.map((s) => ({ key: s.key, label: s.label, color: s.color }))} />
        </Card>
        <div className="space-y-4">
          <Card title="⚠️ Low stock" actions={<Link href="/admin/inventory" className="text-sm font-bold text-tomato">Stock →</Link>}>
            {low.length === 0 ? (
              <p className="text-sm text-char-400">All good 👌</p>
            ) : (
              <ul className="space-y-2 text-sm">
                {low.map((i) => (
                  <li key={i.id} className="flex items-center justify-between">
                    <span>{i.name}</span>
                    <Badge tone={i.stock <= i.lowStock ? "bad" : "warn"}>{Math.max(0, Math.round(i.stock)).toLocaleString()} {i.unit}</Badge>
                  </li>
                ))}
              </ul>
            )}
          </Card>
          {unread.length > 0 && (
            <Card title="💵 Unpaid open tabs">
              <ul className="space-y-1 text-sm">
                {unread.map((o) => (
                  <li key={o.id} className="flex justify-between"><Link href={`/admin/orders/${o.id}`} className="font-bold underline">#{1000 + o.number}</Link><span>{lkr(o.total)}</span></li>
                ))}
              </ul>
            </Card>
          )}
        </div>
      </div>

      <Card title="Best sellers · last 7 days" className="mt-4">
        <Table head={["Item", "Size", "Sold", "Revenue"]}>
          {top.map((r, i) => (
            <tr key={i}>
              <td className="font-bold">{r.name}</td>
              <td>{r.sizeName ?? "—"}</td>
              <td>{r._sum.quantity}</td>
              <td>{lkr(r._sum.lineTotal ?? 0)}</td>
            </tr>
          ))}
        </Table>
      </Card>
    </div>
  );
}
