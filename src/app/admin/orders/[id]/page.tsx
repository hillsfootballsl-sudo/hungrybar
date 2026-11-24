import Link from "next/link";
import { notFound } from "next/navigation";
import { OrderActions } from "@/components/admin/OrderActions";
import { Badge, Card, lkr, PageHeader, Table } from "@/components/admin/ui";
import { db } from "@/lib/db";
import { orderInclude, toTicket } from "@/lib/orderView";
import { SECTORS } from "@/lib/sectors";
import { getAllSettings } from "@/lib/settings";
import { fmtDateTime } from "@/lib/time";

export default async function OrderDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const o = await db.order.findUnique({ where: { id }, include: orderInclude });
  if (!o) notFound();
  const [moves, settings] = await Promise.all([
    db.stockMovement.findMany({ where: { orderId: id }, include: { ingredient: { select: { name: true, unit: true } } }, orderBy: { createdAt: "asc" } }),
    getAllSettings(),
  ]);
  const sectors: Record<string, number> = { FOOD: o.foodCost, PACKAGING: o.packagingCost, ROYALTY: o.royalty, CHARITY: o.charity, DELIVERY: o.deliveryFee, PLATFORM: o.platformFee, PROFIT: o.profit };
  return (
    <div>
      <PageHeader
        title={`Order #${1000 + o.number}`}
        sub={<>{fmtDateTime(o.createdAt)} · {o.channel} · {o.type.replace("_", "-")} {o.staff && `· by ${o.staff.name}`}</>}
        actions={<Link href="/admin/orders" className="btn-ghost">← All orders</Link>}
      />
      <div className="mb-4 flex flex-wrap gap-2">
        <Badge tone={o.status === "COMPLETED" ? "good" : o.status === "CANCELLED" ? "bad" : "info"}>{o.status}</Badge>
        <Badge tone={o.paymentStatus === "PAID" ? "good" : "warn"}>{o.paymentMethod} · {o.paymentStatus}</Badge>
        {o.pointsRedeemed > 0 && <Badge tone="warn">{o.pointsRedeemed} points used</Badge>}{o.pointsEarned > 0 && <Badge tone="info">{o.pointsAwarded ? "Earned" : "Will earn"} {o.pointsEarned} pts</Badge>}
        {o.cancelReason && <Badge tone="bad">Cancelled: {o.cancelReason}</Badge>}
      </div>
      <div className="grid gap-4 xl:grid-cols-[1.3fr_1fr]">
        <div className="space-y-4">
          <Card title="Items">
            <Table head={["Item", "Qty", "Price", "Food cost", "Pack", "Royalty", "Charity"]}>
              {o.items.map((i) => (
                <tr key={i.id}>
                  <td>
                    <p className="font-bold">{i.name} {i.sizeName && <span className="font-normal text-char-400">· {i.sizeName}{i.crustName ? ` · ${i.crustName}` : ""}</span>}</p>
                    {i.summary && <p className="text-xs text-tomato-700">{i.summary}</p>}
                    {i.note && <p className="text-xs italic">“{i.note}”</p>}
                  </td>
                  <td>{i.quantity}</td>
                  <td className="font-bold">{lkr(i.lineTotal)}</td>
                  <td>{lkr(i.foodCost)}</td>
                  <td>{lkr(i.packagingCost)}</td>
                  <td>{lkr(i.royalty)}</td>
                  <td>{lkr(i.charity)}</td>
                </tr>
              ))}
            </Table>
            <dl className="mt-3 space-y-1 border-t border-char-100 pt-3 text-sm">
              <div className="flex justify-between"><dt>Subtotal</dt><dd>{lkr(o.subtotal)}</dd></div>
              {o.discount > 0 && <div className="flex justify-between text-basil"><dt>Discount ({o.discountNote})</dt><dd>−{lkr(o.discount)}</dd></div>}
              {o.deliveryFee > 0 && <div className="flex justify-between"><dt>Delivery ({o.zone?.name})</dt><dd>{lkr(o.deliveryFee)}</dd></div>}
              <div className="flex justify-between text-lg font-bold"><dt>Total</dt><dd>{lkr(o.total)}</dd></div>
              {o.amountTendered != null && <div className="flex justify-between text-char-500"><dt>Cash received / change</dt><dd>{lkr(o.amountTendered)} / {lkr(o.changeGiven ?? 0)}</dd></div>}
            </dl>
          </Card>
          <Card title="Stock used by this order">
            {moves.length === 0 ? (
              <p className="text-sm text-char-400">Stock is deducted when the order is accepted.</p>
            ) : (
              <div className="grid gap-x-6 text-sm sm:grid-cols-2">
                {moves.map((m) => (
                  <div key={m.id} className="flex justify-between border-b border-char-50 py-1">
                    <span>{m.ingredient.name}</span>
                    <span className={m.change < 0 ? "text-tomato" : "text-basil"}>{m.change > 0 ? "+" : ""}{Math.round(m.change * 10) / 10} {m.ingredient.unit} <span className="text-xs text-char-400">{m.reason}</span></span>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
        <div className="space-y-4">
          <Card title="Where the money goes">
            <div className="mb-3 flex h-4 overflow-hidden rounded-full">
              {SECTORS.map((s) => (sectors[s.key] > 0 ? <div key={s.key} style={{ width: `${(sectors[s.key] / o.total) * 100}%`, background: s.color }} className="border-r-2 border-white last:border-0" /> : null))}
            </div>
            <ul className="space-y-1 text-sm">
              {SECTORS.map((s) => (
                <li key={s.key} className="flex justify-between"><span><span className="mr-2 inline-block h-2.5 w-2.5 rounded-sm" style={{ background: s.color }} />{s.label}</span><b>{lkr(sectors[s.key])}</b></li>
              ))}
            </ul>
          </Card>
          <Card title="Customer">
            <p className="font-bold">{o.customerName ?? "Walk-in"}</p>
            {o.customerPhone && <p>0{o.customerPhone.slice(2)} {o.customer && <span className="text-sm text-char-400">· ⭐ {o.customer.points} points</span>}</p>}
            {o.table && <p>Table {o.table.label}</p>}
            {o.address && <p className="text-sm">{o.address}{o.landmark ? ` — ${o.landmark}` : ""}</p>}
            {o.lat && o.lng && <a className="text-sm text-tomato underline" target="_blank" rel="noreferrer" href={`https://www.google.com/maps?q=${o.lat},${o.lng}`}>Pinned location ↗</a>}
            {o.externalRef && <p className="text-sm">Ref: {o.externalRef}</p>}
            {o.rider && <p className="text-sm">Rider: {o.rider.name}</p>}
            {o.note && <p className="mt-2 rounded bg-cream-100 p-2 text-sm">{o.note}</p>}
          </Card>
          <OrderActions ticket={toTicket(o)} print={{ receipt: settings.receipt, shop: settings.shop, pointName: settings.rewards.pointName }} />
        </div>
      </div>
    </div>
  );
}
