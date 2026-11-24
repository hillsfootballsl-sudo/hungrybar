import Link from "next/link";
import { ActionButton, FormDialog } from "@/components/admin/FormDialog";
import { PhotoUpload } from "@/components/admin/PhotoUpload";
import { Badge, Card, lkr, PageHeader } from "@/components/admin/ui";
import { saveAddon, saveCategory, toggleProduct } from "@/lib/actions/admin";
import { db } from "@/lib/db";
import { fmtTime12 } from "@/lib/time";

export const metadata = { title: "Menu" };

export default async function MenuAdmin() {
  const [cats, ings] = await Promise.all([
    db.category.findMany({ orderBy: { sortOrder: "asc" }, include: { products: { orderBy: [{ sortOrder: "asc" }, { name: "asc" }], include: { variants: { where: { active: true }, orderBy: { sortOrder: "asc" } } } }, addons: true } }),
    db.ingredient.findMany({ where: { active: true }, orderBy: { name: "asc" }, select: { id: true, name: true, unit: true } }),
  ]);
  const catFields = [
    { name: "name", label: "Name", type: "text" as const },
    { name: "tagline", label: "Tagline", type: "text" as const },
    { name: "availableFrom", label: "Available from", type: "time" as const, half: true },
    { name: "availableTo", label: "Available until", type: "time" as const, half: true, hint: "Use 24:00 for midnight" },
    { name: "icon", label: "Type", type: "select" as const, options: [["deal", "Deals"], ["pizza", "Pizzas"], ["detroit", "Detroit"], ["sub", "Subs"], ["garlicbread", "Sides"], ["juice", "Juices"], ["mojito", "Mojitos"], ["water", "Drinks"]].map(([v, l]) => ({ value: v, label: l })), half: true },
    { name: "sortOrder", label: "Order", type: "number" as const, half: true },
    { name: "active", label: "Visible", type: "checkbox" as const, half: true },
    { name: "showOnHome", label: "Show on homepage", type: "checkbox" as const, half: true },
  ];
  const ingOpts = [{ value: "", label: "— no stock item —" }, ...ings.map((i) => ({ value: i.id, label: `${i.name} (${i.unit})` }))];
  return (
    <div>
      <PageHeader
        title="Menu"
        sub="Products, sizes, prices, recipes and serving hours. Changes go live instantly on the website and POS."
        actions={
          <>
            <FormDialog trigger="+ Category" triggerClass="btn-ghost" title="New category" action={saveCategory} initial={{ availableFrom: "11:00", availableTo: "24:00", sortOrder: 10, active: true, icon: "pizza" }} fields={catFields} />
            <Link href="/admin/menu/new" className="btn-primary">+ Product</Link>
          </>
        }
      />
      <div className="space-y-4">
        {cats.map((c) => (
          <Card
            key={c.id}
            title={
              <span className={c.active ? "" : "opacity-50"}>
                {c.name} <span className="ml-2 text-xs font-normal text-char-400">{fmtTime12(c.availableFrom)}–{fmtTime12(c.availableTo)}</span>
              </span>
            }
            actions={
              <div className="flex gap-2">
                <FormDialog trigger="+ Add-on" triggerClass="btn-ghost btn-sm" title={`Add-on for ${c.name}`} action={saveAddon} initial={{ categoryId: c.id, price: 0, quantity: 1, active: true, ingredientId: "" }} fields={[{ name: "name", label: "Name", type: "text" }, { name: "price", label: "Price", type: "number", half: true }, { name: "quantity", label: "Stock qty used", type: "number", half: true }, { name: "ingredientId", label: "Stock item", type: "select", options: ingOpts }, { name: "active", label: "Active", type: "checkbox" }]} />
                <FormDialog trigger="Edit" triggerClass="btn-ghost btn-sm" title="Edit category" action={saveCategory} initial={{ ...c, tagline: c.tagline ?? "", icon: c.icon ?? "" }} fields={catFields} />
              </div>
            }
          >
            <div className="mb-3"><PhotoUpload target="category" id={c.id} current={c.imageId ? `/media/${c.imageId}` : null} label="Homepage tile photo (optional)" /></div>
            <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
              {c.products.map((p) => (
                <div key={p.id} className={`flex items-center justify-between gap-2 rounded-lg border border-char-100 p-3 ${p.active ? "" : "opacity-50"}`}>
                  <div className="min-w-0">
                    <Link href={`/admin/menu/${p.id}`} className="font-bold hover:text-tomato">{p.name}</Link>
                    <p className="truncate text-xs text-char-400">{p.variants.map((v) => `${v.name} ${lkr(v.price)}`).join(" · ")}</p>
                    {p.image && <p className="text-[11px] font-bold text-basil">📷 has photo</p>}
                    <div className="mt-1 flex gap-1">{p.featured && <Badge tone="warn">featured</Badge>}{p.kind === "PIZZA" && <Badge tone="info">builder</Badge>}{p.kind === "COMBO" && <Badge tone="warn">combo</Badge>}</div>
                  </div>
                  <div className="flex shrink-0 gap-1">
                    <ActionButton action={toggleProduct.bind(null, p.id, !p.active)}>{p.active ? "Hide" : "Show"}</ActionButton>
                    <Link href={`/admin/menu/${p.id}`} className="btn-ghost btn-sm">Edit</Link>
                  </div>
                </div>
              ))}
            </div>
            {c.addons.length > 0 && (
              <p className="mt-3 text-sm text-char-500">Add-ons: {c.addons.map((a) => `${a.name} (${lkr(a.price)})${a.active ? "" : " [off]"}`).join(", ")}</p>
            )}
          </Card>
        ))}
      </div>
    </div>
  );
}
