import { FormDialog } from "@/components/admin/FormDialog";
import { Badge, Card, lkr, PageHeader, Stat, Table, Tabs } from "@/components/admin/ui";
import { adjustStock, saveIngredient } from "@/lib/actions/admin";
import { db } from "@/lib/db";
import { fmtDateTime } from "@/lib/time";

export const metadata = { title: "Stock" };

const CATS = ["DOUGH", "SAUCE", "CHEESE", "MEAT", "VEG", "FRUIT", "BAKERY", "BEVERAGE", "PACKAGING", "OTHER"];
const fmtQty = (n: number, unit: string) => (unit === "g" && Math.abs(n) >= 1000 ? `${(n / 1000).toFixed(2)} kg` : unit === "ml" && Math.abs(n) >= 1000 ? `${(n / 1000).toFixed(2)} L` : `${Math.round(n * 10) / 10} ${unit}`);

export default async function Inventory({ searchParams }: { searchParams: Promise<{ tab?: string; reason?: string }> }) {
  const sp = await searchParams;
  const tab = sp.tab === "log" ? "log" : "stock";
  const since = new Date(Date.now() - 14 * 86400000);
  const [ings, suppliers, usage, sizes] = await Promise.all([
    db.ingredient.findMany({ orderBy: [{ category: "asc" }, { name: "asc" }], include: { supplier: true } }),
    db.supplier.findMany({ where: { active: true }, orderBy: { name: "asc" } }),
    db.stockMovement.groupBy({ by: ["ingredientId"], where: { reason: { in: ["SALE", "VOID", "WASTAGE"] }, createdAt: { gte: since } }, _sum: { change: true } }),
    db.pizzaSize.findMany({ where: { active: true }, orderBy: { sortOrder: "asc" } }),
  ]);
  const use = new Map(usage.map((u) => [u.ingredientId, -(u._sum.change ?? 0) / 14]));
  const value = ings.reduce((s, i) => s + Math.max(0, i.stock) * i.costPerUnit, 0);
  const lowCount = ings.filter((i) => i.active && i.lowStock > 0 && i.stock <= i.lowStock).length;
  const dough = ings.find((i) => i.category === "DOUGH");
  const supOpts = [{ value: "", label: "— none —" }, ...suppliers.map((s) => ({ value: s.id, label: s.name }))];
  const ingFields = [
    { name: "name", label: "Name", type: "text" as const },
    { name: "unit", label: "Unit", type: "select" as const, options: [{ value: "g", label: "grams (g)" }, { value: "ml", label: "millilitres (ml)" }, { value: "pcs", label: "pieces (pcs)" }], half: true },
    { name: "category", label: "Category", type: "select" as const, options: CATS.map((c) => ({ value: c, label: c })), half: true },
    { name: "costPerUnit", label: "Cost per unit (Rs)", type: "number" as const, hint: "e.g. cheese at Rs 3,200/kg = 3.2 per g", half: true },
    { name: "lowStock", label: "Low-stock alert at", type: "number" as const, half: true },
    { name: "supplierId", label: "Supplier", type: "select" as const, options: supOpts },
    { name: "isPackaging", label: "Packaging (counts as packaging cost)", type: "checkbox" as const, half: true },
    { name: "active", label: "Active", type: "checkbox" as const, half: true },
  ];

  return (
    <div>
      <PageHeader
        title="Stock"
        sub="Every sale deducts the exact recipe grams automatically. Count, add or write off waste here."
        actions={<FormDialog trigger="+ Ingredient" title="New ingredient" action={saveIngredient} initial={{ unit: "g", category: "OTHER", lowStock: 0, costPerUnit: 0, active: true, isPackaging: false }} fields={[...ingFields, { name: "openingStock", label: "Opening stock", type: "number" }]} />}
      />
      <Tabs active={tab === "log" ? "/admin/inventory?tab=log" : "/admin/inventory"} items={[{ href: "/admin/inventory", label: "Current stock" }, { href: "/admin/inventory?tab=log", label: "Movement log" }]} />
      {tab === "stock" ? (
        <>
          <div className="mb-4 grid grid-cols-2 gap-3 md:grid-cols-4">
            <Stat label="Stock value" value={lkr(value)} sub="at current cost" />
            <Stat label="Low / out" value={lowCount} tone={lowCount ? "bad" : "good"} sub={lowCount ? "needs reordering" : "all good"} />
            {dough &&
              sizes.filter((s) => s.shape === "ROUND").slice(0, 2).map((s) => (
                <Stat key={s.id} label={`Dough left for`} value={`${Math.max(0, Math.floor(dough.stock / s.doughGrams))} × ${s.short}`} sub={`${s.name} pizzas (${s.doughGrams}g each)`} />
              ))}
          </div>
          <Card>
            <Table head={["Ingredient", "In stock", "Alert at", "Cost / unit", "Value", "Avg use / day", "Days left", "", ""]}>
              {ings.map((i) => {
                const daily = use.get(i.id) ?? 0;
                const days = daily > 0 ? i.stock / daily : Infinity;
                const low = i.lowStock > 0 && i.stock <= i.lowStock;
                const lead = i.supplier?.leadDays ?? 2;
                const reorder = daily > 0 && days < lead + 2 ? Math.ceil(daily * 7 - Math.max(0, i.stock)) : 0;
                return (
                  <tr key={i.id} id={i.id} className={!i.active ? "opacity-40" : low ? "bg-tomato-50/60" : ""}>
                    <td>
                      <p className="font-bold">{i.name}</p>
                      <p className="text-xs text-char-400">{i.category}{i.supplier ? ` · ${i.supplier.name}` : ""}</p>
                    </td>
                    <td className="whitespace-nowrap">
                      <span className={`font-bold ${i.stock < 0 ? "text-tomato" : ""}`}>{fmtQty(i.stock, i.unit)}</span>
                      <div className="mt-1 h-1.5 w-24 rounded-full bg-char-50">
                        <div className={`h-full rounded-full ${low ? "bg-tomato" : "bg-basil"}`} style={{ width: `${Math.min(100, i.lowStock ? (Math.max(0, i.stock) / (i.lowStock * 4)) * 100 : 100)}%` }} />
                      </div>
                    </td>
                    <td className="whitespace-nowrap">{fmtQty(i.lowStock, i.unit)}</td>
                    <td>{i.costPerUnit.toFixed(i.costPerUnit < 10 ? 2 : 0)}</td>
                    <td>{lkr(Math.max(0, i.stock) * i.costPerUnit)}</td>
                    <td className="whitespace-nowrap">{daily ? fmtQty(daily, i.unit) : "—"}</td>
                    <td>
                      {days === Infinity ? "—" : <Badge tone={days < lead ? "bad" : days < lead + 3 ? "warn" : "good"}>{days < 0 ? "0" : days.toFixed(1)} d</Badge>}
                      {reorder > 0 && <p className="mt-1 text-xs font-bold text-tomato">Reorder ~{fmtQty(reorder, i.unit)}</p>}
                    </td>
                    <td>
                      <FormDialog
                        trigger="Adjust"
                        triggerClass="btn-ghost btn-sm"
                        title={`Adjust ${i.name}`}
                        action={adjustStock}
                        extra={{ ingredientId: i.id }}
                        initial={{ mode: "count", qty: "", note: "" }}
                        fields={[
                          { name: "mode", label: "What happened?", type: "select", options: [{ value: "count", label: `Physical count — set stock to…` }, { value: "add", label: "Add (received / found)" }, { value: "waste", label: "Wastage — burnt, dropped, expired" }] },
                          { name: "qty", label: `Quantity (${i.unit})`, type: "number", hint: `Currently ${fmtQty(i.stock, i.unit)}` },
                          { name: "note", label: "Note", type: "text", placeholder: "e.g. dropped tray" },
                        ]}
                      />
                    </td>
                    <td>
                      <FormDialog trigger="Edit" triggerClass="btn-ghost btn-sm" title={`Edit ${i.name}`} action={saveIngredient} initial={{ ...i, supplierId: i.supplierId ?? "" }} fields={ingFields} />
                    </td>
                  </tr>
                );
              })}
            </Table>
          </Card>
        </>
      ) : (
        <MovementLog reason={sp.reason} />
      )}
    </div>
  );
}

async function MovementLog({ reason }: { reason?: string }) {
  const valid = ["SALE", "VOID", "PURCHASE", "WASTAGE", "ADJUSTMENT", "OPENING"];
  const where = reason && valid.includes(reason) ? { reason: reason as never } : {};
  const [rows, wasteAgg] = await Promise.all([
    db.stockMovement.findMany({ where, orderBy: { createdAt: "desc" }, take: 200, include: { ingredient: { select: { name: true, unit: true } } } }),
    db.stockMovement.findMany({ where: { reason: "WASTAGE", createdAt: { gte: new Date(Date.now() - 30 * 86400000) } }, select: { change: true, unitCost: true } }),
  ]);
  const wasteValue = wasteAgg.reduce((s, r) => s + Math.abs(r.change) * (r.unitCost ?? 0), 0);
  return (
    <>
      <div className="mb-3 flex flex-wrap items-center gap-2">
        {["", ...valid].map((r) => (
          <a key={r} href={`/admin/inventory?tab=log${r ? `&reason=${r}` : ""}`} className={`rounded-full px-3 py-1 text-xs font-bold ${reason === r || (!reason && !r) ? "bg-char text-cream" : "bg-white"}`}>{r || "All"}</a>
        ))}
        <span className="ml-auto text-sm">Wastage last 30 days: <b className="text-tomato">{lkr(wasteValue)}</b></span>
      </div>
      <Card>
        <Table head={["When", "Ingredient", "Change", "Balance", "Reason", "Note"]}>
          {rows.map((m) => (
            <tr key={m.id}>
              <td className="whitespace-nowrap text-char-500">{fmtDateTime(m.createdAt)}</td>
              <td className="font-bold">{m.ingredient.name}</td>
              <td className={m.change < 0 ? "text-tomato" : "text-basil"}>{m.change > 0 ? "+" : ""}{fmtQty(m.change, m.ingredient.unit)}</td>
              <td>{fmtQty(m.balance, m.ingredient.unit)}</td>
              <td><Badge tone={m.reason === "WASTAGE" ? "bad" : m.reason === "PURCHASE" ? "good" : m.reason === "SALE" ? "neutral" : "info"}>{m.reason}</Badge></td>
              <td className="text-char-500">{m.note ?? (m.orderId ? <a className="underline" href={`/admin/orders/${m.orderId}`}>order</a> : "")}</td>
            </tr>
          ))}
        </Table>
      </Card>
    </>
  );
}
