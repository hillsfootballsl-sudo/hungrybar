import { ActionButton, FormDialog } from "@/components/admin/FormDialog";
import { PhotoUpload } from "@/components/admin/PhotoUpload";
import { Badge, Card, PageHeader } from "@/components/admin/ui";
import { deleteBanner, saveBanner } from "@/lib/actions/admin";
import { db } from "@/lib/db";

export const metadata = { title: "Homepage banners" };

export default async function Banners() {
  const banners = await db.banner.findMany({ orderBy: { sortOrder: "asc" } });
  const fields = [
    { name: "title", label: "Big headline", type: "text" as const },
    { name: "subtitle", label: "Small line under it", type: "text" as const },
    { name: "cta", label: "Button text", type: "text" as const, half: true },
    { name: "link", label: "Button goes to", type: "text" as const, half: true, hint: "e.g. /menu?c=deals or /rewards" },
    { name: "theme", label: "Colours (when there's no photo)", type: "select" as const, options: [{ value: "dark", label: "Charcoal" }, { value: "red", label: "Tomato red" }, { value: "cream", label: "Cream" }], half: true },
    { name: "sortOrder", label: "Order", type: "number" as const, half: true },
    { name: "active", label: "Showing", type: "checkbox" as const },
  ];
  return (
    <div>
      <PageHeader title="Homepage banners" sub="The sliding banners at the top of the website. Add a wide photo (about 1600×600) or let the site draw one in your colours." actions={<FormDialog trigger="+ Banner" title="New banner" action={saveBanner} initial={{ theme: "dark", cta: "Order now", link: "/menu", sortOrder: banners.length + 1, active: true, imageId: "" }} fields={fields} />} />
      <div className="grid gap-4 lg:grid-cols-2">
        {banners.map((b) => (
          <Card key={b.id} title={<span className={b.active ? "" : "opacity-50"}>{b.title}</span>} actions={<div className="flex gap-2">{b.active ? <Badge tone="good">Showing</Badge> : <Badge>Hidden</Badge>}<FormDialog trigger="Edit" triggerClass="btn-ghost btn-sm" title="Edit banner" action={saveBanner} initial={{ ...b, subtitle: b.subtitle ?? "", imageId: b.imageId ?? "" }} fields={fields} /><ActionButton action={deleteBanner.bind(null, b.id)} confirm="Delete this banner?">Delete</ActionButton></div>}>
            <p className="text-sm text-char-500">{b.subtitle}</p>
            <p className="mt-1 text-xs text-char-400">Button “{b.cta}” → {b.link}</p>
            <div className="mt-3"><PhotoUpload target="banner" id={b.id} current={b.imageId ? `/media/${b.imageId}` : null} label="Banner photo (optional)" square={false} /></div>
          </Card>
        ))}
      </div>
    </div>
  );
}
