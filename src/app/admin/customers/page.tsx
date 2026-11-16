import { FormDialog } from "@/components/admin/FormDialog";
import { Badge, Card, lkr, PageHeader, Stat, Table } from "@/components/admin/ui";
import { setStamps } from "@/lib/actions/admin";
import { db } from "@/lib/db";
import { getSetting } from "@/lib/settings";
import { fmtDateTime } from "@/lib/time";

export const metadata = { title: "Customers" };

export default async function Customers({ searchParams }: { searchParams: Promise<{ q?: string; sort?: string }> }) {
  const sp = await searchParams;
  const loyalty = await getSetting("loyalty");
  const q = sp.q?.trim();
  const where = q ? { OR: [{ phone: { contains: q.replace(/\D/g, "").slice(-9) || "xx" } }, { name: { contains: q, mode: "insensitive" as const } }] } : {};
  const orderBy = sp.sort === "recent" ? { createdAt: "desc" as const } : sp.sort === "stamps" ? { stamps: "desc" as const } : { totalSpent: "desc" as const };
  const [customers, count, ready, rewards] = await Promise.all([
    db.customer.findMany({ where, orderBy, take: 200, include: { orders: { orderBy: { createdAt: "desc" }, take: 1, select: { createdAt: true } } } }),
    db.customer.count(),
    db.customer.count({ where: { stamps: { gte: loyalty.stampsRequired - 1 } } }),
    db.customer.aggregate({ _sum: { rewardsUsed: true } }),
  ]);
  return (
    <div>
      <PageHeader title="Customers & rewards" sub={`Every ${loyalty.stampsRequired}th order earns a free pizza. Stamps are added automatically when an order with a phone number is completed.`} />
      <div className="mb-4 grid grid-cols-3 gap-3">
        <Stat label="Customers" value={count} />
        <Stat label="Free pizza ready" value={ready} sub="will be offered at checkout / POS" />
        <Stat label="Free pizzas given" value={rewards._sum.rewardsUsed ?? 0} />
      </div>
      <form className="mb-3 flex gap-2">
        <input name="q" defaultValue={q} placeholder="Search phone or name" className="input w-64" />
        <select name="sort" defaultValue={sp.sort ?? "spent"} className="input w-auto">
          <option value="spent">Top spenders</option>
          <option value="stamps">Most stamps</option>
          <option value="recent">Newest</option>
        </select>
        <button className="btn-dark">Go</button>
      </form>
      <Card>
        <Table head={["Customer", "Phone", "Orders", "Spent", "Stamps", "Last order", ""]}>
          {customers.map((c) => (
            <tr key={c.id}>
              <td className="font-bold">{c.name ?? "—"}{c.notes && <p className="text-xs font-normal text-char-400">{c.notes}</p>}</td>
              <td><a href={`https://wa.me/${c.phone}`} target="_blank" rel="noreferrer" className="underline">0{c.phone.slice(2)}</a></td>
              <td>{c.totalOrders}</td>
              <td>{lkr(c.totalSpent)}</td>
              <td>
                <span className="font-bold">{c.stamps}</span>/{loyalty.stampsRequired - 1}
                {c.stamps >= loyalty.stampsRequired - 1 && <Badge tone="warn">🍕 ready</Badge>}
              </td>
              <td className="text-char-500">{c.orders[0] ? fmtDateTime(c.orders[0].createdAt) : "—"}</td>
              <td>
                <FormDialog trigger="Edit" triggerClass="btn-ghost btn-sm" title={`Customer 0${c.phone.slice(2)}`} action={setStamps} initial={{ id: c.id, name: c.name ?? "", stamps: c.stamps, notes: c.notes ?? "" }} fields={[{ name: "name", label: "Name", type: "text" }, { name: "stamps", label: "Stamps", type: "number", hint: "Correct manually if needed" }, { name: "notes", label: "Notes", type: "textarea", placeholder: "Allergies, favourite order…" }]} />
              </td>
            </tr>
          ))}
        </Table>
      </Card>
    </div>
  );
}
