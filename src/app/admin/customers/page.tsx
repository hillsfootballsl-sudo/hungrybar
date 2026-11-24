import { FormDialog } from "@/components/admin/FormDialog";
import { Badge, Card, lkr, PageHeader, Stat, Table } from "@/components/admin/ui";
import { adjustPoints, saveCustomer, saveReward } from "@/lib/actions/admin";
import { db } from "@/lib/db";
import { getSetting } from "@/lib/settings";
import { fmtDateTime } from "@/lib/time";

export const metadata = { title: "Customers & rewards" };

export default async function Customers({ searchParams }: { searchParams: Promise<{ q?: string; sort?: string }> }) {
  const sp = await searchParams;
  const cfg = await getSetting("rewards");
  const q = sp.q?.trim();
  const where = q ? { OR: [{ phone: { contains: q.replace(/\D/g, "").slice(-9) || "xx" } }, { name: { contains: q, mode: "insensitive" as const } }] } : {};
  const orderBy = sp.sort === "recent" ? { createdAt: "desc" as const } : sp.sort === "points" ? { points: "desc" as const } : { totalSpent: "desc" as const };
  const [customers, count, totals, rewards, products, issued, spent] = await Promise.all([
    db.customer.findMany({ where, orderBy, take: 200, include: { orders: { orderBy: { createdAt: "desc" }, take: 1, select: { createdAt: true } } } }),
    db.customer.count(),
    db.customer.aggregate({ _sum: { points: true } }),
    db.rewardItem.findMany({ orderBy: [{ sortOrder: "asc" }, { points: "asc" }], include: { product: { select: { name: true } } } }),
    db.product.findMany({ where: { kind: { not: "COMBO" } }, orderBy: { name: "asc" }, include: { variants: { where: { active: true }, include: { size: true } } } }),
    db.pointsTxn.aggregate({ where: { change: { gt: 0 }, createdAt: { gte: new Date(Date.now() - 30 * 86400000) } }, _sum: { change: true } }),
    db.pointsTxn.aggregate({ where: { reason: "REDEEM", createdAt: { gte: new Date(Date.now() - 30 * 86400000) } }, _sum: { change: true } }),
  ]);
  const variantOpts = [{ value: "", label: "— default size —" }, ...products.flatMap((p) => p.variants.map((v) => ({ value: v.id, label: `${p.name} · ${v.size?.name ?? v.name}` })))];
  const productOpts = products.map((p) => ({ value: p.id, label: p.name }));
  const rewardFields = [
    { name: "name", label: "Reward name (what customers see)", type: "text" as const },
    { name: "description", label: "Short description", type: "text" as const },
    { name: "points", label: "Points needed", type: "number" as const, half: true },
    { name: "sortOrder", label: "Order", type: "number" as const, half: true },
    { name: "productId", label: "Free item", type: "select" as const, options: productOpts },
    { name: "variantId", label: "Which size", type: "select" as const, options: variantOpts, hint: "Must belong to the item above" },
    { name: "active", label: "Available", type: "checkbox" as const },
  ];
  const valuePerPoint = 1 / cfg.rupeesPerPoint;
  return (
    <div>
      <PageHeader title="Customers & rewards" sub={`${cfg.programName}: Rs ${cfg.rupeesPerPoint} spent = 1 point · points last ${cfg.expiryMonths} months · rules in Settings.`} />
      <div className="mb-4 grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat label="Customers" value={count} />
        <Stat label="Points in wallets" value={(totals._sum.points ?? 0).toLocaleString()} sub={`≈ ${lkr((totals._sum.points ?? 0) * valuePerPoint * 10)} of free food at ~10% back`} />
        <Stat label="Points issued · 30 days" value={(issued._sum.change ?? 0).toLocaleString()} />
        <Stat label="Points redeemed · 30 days" value={Math.abs(spent._sum.change ?? 0).toLocaleString()} />
      </div>

      <Card title="Rewards menu — what points can buy" className="mb-4" actions={<FormDialog trigger="+ Reward" triggerClass="btn-ghost btn-sm" title="New reward" action={saveReward} initial={{ points: 500, sortOrder: 10, active: true, productId: productOpts[0]?.value, variantId: "" }} fields={rewardFields} />}>
        <Table head={["Reward", "Points", "Free item", "Status", ""]}>
          {rewards.map((r) => (
            <tr key={r.id} className={r.active ? "" : "opacity-50"}>
              <td><p className="font-bold">{r.name}</p><p className="text-xs text-char-400">{r.description}</p></td>
              <td className="font-bold">{r.points.toLocaleString()}</td>
              <td>{r.product.name}</td>
              <td>{r.active ? <Badge tone="good">Live</Badge> : <Badge>Hidden</Badge>}</td>
              <td><FormDialog trigger="Edit" triggerClass="btn-ghost btn-sm" title={`Edit ${r.name}`} action={saveReward} initial={{ ...r, description: r.description ?? "", variantId: r.variantId ?? "" }} fields={rewardFields} /></td>
            </tr>
          ))}
        </Table>
      </Card>

      <form className="mb-3 flex flex-wrap gap-2">
        <input name="q" defaultValue={q} placeholder="Search phone or name" className="input w-64" />
        <select name="sort" defaultValue={sp.sort ?? "spent"} className="input w-auto">
          <option value="spent">Top spenders</option>
          <option value="points">Most points</option>
          <option value="recent">Newest</option>
        </select>
        <button className="btn-dark">Go</button>
      </form>
      <Card>
        <Table head={["Customer", "Phone", "Orders", "Spent", "Points", "Birthday", "Last order", "", ""]}>
          {customers.map((c) => (
            <tr key={c.id}>
              <td className="font-bold">{c.name ?? "—"}{c.notes && <p className="text-xs font-normal text-char-400">{c.notes}</p>}</td>
              <td><a href={`https://wa.me/${c.phone}`} target="_blank" rel="noreferrer" className="underline">0{c.phone.slice(2)}</a></td>
              <td>{c.totalOrders}</td>
              <td>{lkr(c.totalSpent)}</td>
              <td className="font-bold">{c.points.toLocaleString()}</td>
              <td>{c.birthday ?? "—"}</td>
              <td className="whitespace-nowrap text-char-500">{c.orders[0] ? fmtDateTime(c.orders[0].createdAt) : "—"}</td>
              <td><FormDialog trigger="± Points" triggerClass="btn-ghost btn-sm" title={`Adjust points · 0${c.phone.slice(2)}`} action={adjustPoints} initial={{ id: c.id, points: "", note: "" }} fields={[{ name: "points", label: "Points (use minus to remove, e.g. -100)", type: "number", hint: `Balance now ${c.points}` }, { name: "note", label: "Reason", type: "text", placeholder: "Sorry for the late delivery" }]} /></td>
              <td><FormDialog trigger="Edit" triggerClass="btn-ghost btn-sm" title={`Customer 0${c.phone.slice(2)}`} action={saveCustomer} initial={{ id: c.id, name: c.name ?? "", notes: c.notes ?? "", birthday: c.birthday ?? "" }} fields={[{ name: "name", label: "Name", type: "text" }, { name: "birthday", label: "Birthday (MM-DD)", type: "text", placeholder: "07-21" }, { name: "notes", label: "Notes", type: "textarea", placeholder: "Allergies, favourite order…" }]} /></td>
            </tr>
          ))}
        </Table>
      </Card>
    </div>
  );
}
