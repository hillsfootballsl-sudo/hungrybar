import { FormDialog } from "@/components/admin/FormDialog";
import { ToppingMatrix } from "@/components/admin/ToppingMatrix";
import { Card, lkr, PageHeader, Table } from "@/components/admin/ui";
import { saveCrust, saveSize } from "@/lib/actions/admin";
import { db } from "@/lib/db";

export const metadata = { title: "Pizza builder & recipes" };

export default async function BuilderAdmin() {
  const [sizes, crusts, toppings, ings] = await Promise.all([
    db.pizzaSize.findMany({ orderBy: { sortOrder: "asc" }, include: { box: true } }),
    db.crust.findMany({ orderBy: { sortOrder: "asc" }, include: { dough: true } }),
    db.topping.findMany({ orderBy: [{ group: "asc" }, { sortOrder: "asc" }], include: { sizes: true } }),
    db.ingredient.findMany({ where: { active: true }, orderBy: { name: "asc" }, select: { id: true, name: true, isPackaging: true, category: true } }),
  ]);
  const boxOpts = [{ value: "", label: "— none —" }, ...ings.filter((i) => i.isPackaging).map((i) => ({ value: i.id, label: i.name }))];
  const doughOpts = [{ value: "", label: "— none —" }, ...ings.filter((i) => !i.isPackaging).map((i) => ({ value: i.id, label: i.name }))];
  const sizeFields = [
    { name: "name", label: "Name", type: "text" as const, half: true },
    { name: "short", label: "Short code (POS)", type: "text" as const, half: true },
    { name: "persons", label: "Serves", type: "number" as const, half: true },
    { name: "shape", label: "Shape", type: "select" as const, options: [{ value: "ROUND", label: "Round" }, { value: "RECT", label: "Rectangle (Detroit)" }], half: true },
    { name: "doughGrams", label: "Dough (g)", type: "number" as const, half: true },
    { name: "basePrice", label: "Custom builder base price", type: "number" as const, half: true, hint: "Plain base before sauce/cheese/toppings" },
    { name: "royalty", label: "Royalty per pizza (Rs)", type: "number" as const, half: true },
    { name: "charity", label: "Charity per pizza (Rs)", type: "number" as const, half: true },
    { name: "boxId", label: "Box", type: "select" as const, options: boxOpts },
    { name: "sortOrder", label: "Order", type: "number" as const, half: true },
    { name: "inBuilder", label: "Offer in Build-your-own", type: "checkbox" as const, half: true },
    { name: "active", label: "Active", type: "checkbox" as const },
  ];
  const crustFields = [
    { name: "name", label: "Name", type: "text" as const },
    { name: "description", label: "Description", type: "text" as const },
    { name: "extraPrice", label: "Extra price (Rs)", type: "number" as const, half: true },
    { name: "doughFactor", label: "Dough multiplier", type: "number" as const, half: true, hint: "1 = full dough, 0.8 = 20% less" },
    { name: "doughId", label: "Dough stock item", type: "select" as const, options: doughOpts },
    { name: "sortOrder", label: "Order", type: "number" as const, half: true },
    { name: "active", label: "Active", type: "checkbox" as const, half: true },
  ];
  return (
    <div>
      <PageHeader title="Pizza builder & recipes" sub="These grams drive automatic stock deduction and food cost for every pizza sold — preset or custom." />
      <div className="grid gap-4 xl:grid-cols-2">
        <Card title="Sizes" actions={<FormDialog trigger="+ Size" triggerClass="btn-ghost btn-sm" title="New size" action={saveSize} initial={{ shape: "ROUND", persons: 1, sortOrder: 10, inBuilder: true, active: true, boxId: "" }} fields={sizeFields} />}>
          <Table head={["Size", "Dough", "Base price", "Royalty", "Charity", "Box", ""]}>
            {sizes.map((s) => (
              <tr key={s.id} className={s.active ? "" : "opacity-50"}>
                <td className="font-bold">{s.name} <span className="text-xs text-char-400">{s.short}{s.shape === "RECT" ? " · rect" : ""}</span></td>
                <td>{s.doughGrams}g</td>
                <td>{lkr(s.basePrice)}</td>
                <td>{lkr(s.royalty)}</td>
                <td>{lkr(s.charity)}</td>
                <td className="text-xs">{s.box?.name ?? "—"}</td>
                <td><FormDialog trigger="Edit" triggerClass="btn-ghost btn-sm" title={`Edit ${s.name}`} action={saveSize} initial={{ ...s, boxId: s.boxId ?? "" }} fields={sizeFields} /></td>
              </tr>
            ))}
          </Table>
        </Card>
        <Card title="Bases / crusts" actions={<FormDialog trigger="+ Base" triggerClass="btn-ghost btn-sm" title="New base" action={saveCrust} initial={{ extraPrice: 0, doughFactor: 1, sortOrder: 10, active: true, doughId: crusts[0]?.doughId ?? "" }} fields={crustFields} />}>
          <Table head={["Base", "Extra", "Dough", ""]}>
            {crusts.map((c) => (
              <tr key={c.id} className={c.active ? "" : "opacity-50"}>
                <td><p className="font-bold">{c.name}</p><p className="text-xs text-char-400">{c.description}</p></td>
                <td>{c.extraPrice ? lkr(c.extraPrice) : "free"}</td>
                <td className="text-xs">{c.dough?.name ?? "—"} × {c.doughFactor}</td>
                <td><FormDialog trigger="Edit" triggerClass="btn-ghost btn-sm" title={`Edit ${c.name}`} action={saveCrust} initial={{ ...c, description: c.description ?? "", doughId: c.doughId ?? "" }} fields={crustFields} /></td>
              </tr>
            ))}
          </Table>
        </Card>
      </div>
      <Card title="Toppings — grams & price per portion, per size" className="mt-4">
        <ToppingMatrix
          sizes={sizes.map((s) => ({ id: s.id, short: s.short, name: s.name }))}
          ingredients={ings}
          toppings={toppings.map((t) => ({ id: t.id, name: t.name, group: t.group, visual: t.visual, ingredientId: t.ingredientId ?? "", maxPortions: t.maxPortions, unitLabel: t.unitLabel, isVeg: t.isVeg, active: t.active, sortOrder: t.sortOrder, sizes: Object.fromEntries(t.sizes.map((x) => [x.sizeId, { grams: x.grams, price: x.price }])) }))}
        />
      </Card>
    </div>
  );
}
