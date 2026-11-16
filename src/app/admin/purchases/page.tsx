import { FormDialog } from "@/components/admin/FormDialog";
import { PurchaseForm } from "@/components/admin/PurchaseForm";
import { Badge, Card, lkr, PageHeader, Table } from "@/components/admin/ui";
import { saveSupplier } from "@/lib/actions/admin";
import { db } from "@/lib/db";
import { fmtDateTime } from "@/lib/time";

export const metadata = { title: "Purchases" };

export default async function Purchases() {
  const [purchases, suppliers, ingredients, month] = await Promise.all([
    db.purchase.findMany({ orderBy: { date: "desc" }, take: 60, include: { supplier: true, items: { include: { ingredient: { select: { name: true, unit: true } } } } } }),
    db.supplier.findMany({ orderBy: { name: "asc" }, include: { _count: { select: { ingredients: true } } } }),
    db.ingredient.findMany({ where: { active: true }, orderBy: { name: "asc" }, select: { id: true, name: true, unit: true, costPerUnit: true, supplierId: true } }),
    db.purchase.aggregate({ where: { date: { gte: new Date(Date.now() - 30 * 86400000) } }, _sum: { total: true } }),
  ]);
  const unpaid = purchases.filter((p) => !p.paid).reduce((s, p) => s + p.total, 0);
  const supFields = [
    { name: "name", label: "Name", type: "text" as const },
    { name: "phone", label: "Phone", type: "text" as const, half: true },
    { name: "leadDays", label: "Delivery lead time (days)", type: "number" as const, half: true, hint: "Used for reorder suggestions" },
    { name: "notes", label: "Notes", type: "textarea" as const },
    { name: "active", label: "Active", type: "checkbox" as const },
  ];
  return (
    <div>
      <PageHeader
        title="Purchases & suppliers"
        sub={`Last 30 days: ${lkr(month._sum.total ?? 0)} purchased${unpaid ? ` · ${lkr(unpaid)} unpaid to suppliers` : ""}`}
        actions={<PurchaseForm ingredients={ingredients} suppliers={suppliers.filter((s) => s.active).map((s) => ({ id: s.id, name: s.name }))} />}
      />
      <div className="grid gap-4 xl:grid-cols-[1fr_360px]">
        <Card title="Purchase history">
          <Table head={["Date", "Supplier", "Invoice", "Items", "Total", ""]}>
            {purchases.map((p) => (
              <tr key={p.id}>
                <td className="whitespace-nowrap">{fmtDateTime(p.date)}</td>
                <td>{p.supplier?.name ?? "—"}</td>
                <td>{p.invoiceNo ?? "—"}</td>
                <td className="text-xs text-char-500">{p.items.map((i) => `${i.ingredient.name} ${Math.round(i.quantity)}${i.ingredient.unit}`).join(", ")}</td>
                <td className="font-bold">{lkr(p.total)}</td>
                <td>{p.paid ? <Badge tone="good">Paid</Badge> : <Badge tone="bad">Unpaid</Badge>}</td>
              </tr>
            ))}
          </Table>
        </Card>
        <Card title="Suppliers" actions={<FormDialog trigger="+ Add" triggerClass="btn-ghost btn-sm" title="New supplier" action={saveSupplier} initial={{ leadDays: 2, active: true }} fields={supFields} />}>
          <ul className="divide-y divide-char-50">
            {suppliers.map((s) => (
              <li key={s.id} className={`flex items-center justify-between py-2 ${s.active ? "" : "opacity-40"}`}>
                <div>
                  <p className="font-bold">{s.name}</p>
                  <p className="text-xs text-char-400">{s.phone || "no phone"} · {s.leadDays}d lead · {s._count.ingredients} items</p>
                </div>
                <FormDialog trigger="Edit" triggerClass="btn-ghost btn-sm" title="Edit supplier" action={saveSupplier} initial={{ ...s, phone: s.phone ?? "", notes: s.notes ?? "" }} fields={supFields} />
              </li>
            ))}
          </ul>
        </Card>
      </div>
    </div>
  );
}
