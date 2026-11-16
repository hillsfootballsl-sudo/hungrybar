import Link from "next/link";
import { Badge, Card, lkr, PageHeader, Table } from "@/components/admin/ui";
import { db } from "@/lib/db";
import { addDays, colomboDateKey, fmtDateTime, startOfColomboDay } from "@/lib/time";
import type { Prisma } from "@prisma/client";

export const metadata = { title: "Orders" };

const tone = (s: string) => (s === "COMPLETED" ? "good" : s === "CANCELLED" ? "bad" : s === "PENDING" ? "warn" : "info");

export default async function Orders({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams;
  const today = colomboDateKey();
  const day = sp.day && /^\d{4}-\d{2}-\d{2}$/.test(sp.day) ? sp.day : today;
  const where: Prisma.OrderWhereInput = { createdAt: { gte: startOfColomboDay(day), lt: startOfColomboDay(addDays(day, 1)) } };
  if (sp.status) where.status = sp.status as never;
  if (sp.channel) where.channel = sp.channel as never;
  if (sp.q) {
    const n = Number(sp.q) - 1000;
    where.OR = [{ customerPhone: { contains: sp.q.replace(/\D/g, "").slice(-9) || "xx" } }, { customerName: { contains: sp.q, mode: "insensitive" } }, ...(Number.isFinite(n) && n > 0 ? [{ number: n }] : [])];
    delete where.createdAt;
  }
  const orders = await db.order.findMany({ where, orderBy: { createdAt: "desc" }, take: 300, include: { _count: { select: { items: true } }, staff: { select: { name: true } } } });
  const ok = orders.filter((o) => o.status !== "CANCELLED");
  const qs = (patch: Record<string, string | undefined>) => "?" + new URLSearchParams(Object.entries({ day, status: sp.status, channel: sp.channel, ...patch }).filter(([, v]) => v) as [string, string][]).toString();
  return (
    <div>
      <PageHeader title="Orders" sub={`${ok.length} orders · ${lkr(ok.reduce((s, o) => s + o.total, 0))} · profit ${lkr(ok.reduce((s, o) => s + o.profit, 0))}`} />
      <form className="mb-3 flex flex-wrap items-center gap-2">
        <a href={qs({ day: addDays(day, -1) })} className="btn-ghost">←</a>
        <input type="date" name="day" defaultValue={day} className="input w-auto" />
        <a href={qs({ day: addDays(day, 1) })} className="btn-ghost">→</a>
        <input name="q" defaultValue={sp.q} placeholder="Search #, phone, name" className="input w-56" />
        <button className="btn-dark">Go</button>
      </form>
      <div className="mb-3 flex flex-wrap gap-1 text-xs">
        {["", "PENDING", "CONFIRMED", "PREPARING", "READY", "OUT_FOR_DELIVERY", "COMPLETED", "CANCELLED"].map((s) => (
          <Link key={s} href={qs({ status: s || undefined })} className={`rounded-full px-3 py-1 font-bold ${(sp.status ?? "") === s ? "bg-char text-cream" : "bg-white"}`}>{s || "All statuses"}</Link>
        ))}
        <span className="mx-2" />
        {["", "POS", "WEB", "QR", "UBER", "PICKME"].map((c) => (
          <Link key={c} href={qs({ channel: c || undefined })} className={`rounded-full px-3 py-1 font-bold ${(sp.channel ?? "") === c ? "bg-tomato text-white" : "bg-white"}`}>{c || "All channels"}</Link>
        ))}
      </div>
      <Card>
        <Table head={["#", "Time", "Channel", "Type", "Customer", "Items", "Total", "Profit", "Payment", "Status"]}>
          {orders.map((o) => (
            <tr key={o.id} className="hover:bg-cream-100">
              <td><Link href={`/admin/orders/${o.id}`} className="font-bold text-tomato underline">#{1000 + o.number}</Link></td>
              <td className="whitespace-nowrap">{fmtDateTime(o.createdAt)}</td>
              <td>{o.channel}</td>
              <td>{o.type.replace("_", "-")}</td>
              <td>{o.customerName ?? "—"}{o.customerPhone ? <span className="block text-xs text-char-400">0{o.customerPhone.slice(2)}</span> : null}</td>
              <td>{o._count.items}</td>
              <td className="font-bold">{lkr(o.total)}</td>
              <td className={o.profit < 0 ? "text-tomato" : ""}>{lkr(o.profit)}</td>
              <td><Badge tone={o.paymentStatus === "PAID" ? "good" : o.paymentStatus === "UNPAID" ? "warn" : "bad"}>{o.paymentMethod} · {o.paymentStatus}</Badge></td>
              <td><Badge tone={tone(o.status)}>{o.status.replaceAll("_", " ")}</Badge></td>
            </tr>
          ))}
        </Table>
        {orders.length === 0 && <p className="p-6 text-center text-char-400">No orders.</p>}
      </Card>
    </div>
  );
}
