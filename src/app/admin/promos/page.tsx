import { FormDialog } from "@/components/admin/FormDialog";
import { Badge, Card, PageHeader, Table } from "@/components/admin/ui";
import { savePromo } from "@/lib/actions/admin";
import { db } from "@/lib/db";

export const metadata = { title: "Promo codes" };

const fields = [
  { name: "code", label: "Code", type: "text" as const, half: true, placeholder: "WEEKEND20" },
  { name: "type", label: "Type", type: "select" as const, options: [{ value: "PERCENT", label: "% off" }, { value: "FIXED", label: "Rs off" }], half: true },
  { name: "value", label: "Value", type: "number" as const, half: true },
  { name: "minOrder", label: "Minimum order (Rs)", type: "number" as const, half: true },
  { name: "maxDiscount", label: "Max discount (Rs)", type: "number" as const, half: true, hint: "Blank = no cap" },
  { name: "maxUses", label: "Max uses", type: "number" as const, half: true, hint: "Blank = unlimited" },
  { name: "startsAt", label: "Starts", type: "datetime-local" as const, half: true },
  { name: "endsAt", label: "Ends", type: "datetime-local" as const, half: true },
  { name: "description", label: "Description", type: "text" as const },
  { name: "webOnly", label: "Online orders only", type: "checkbox" as const, half: true },
  { name: "active", label: "Active", type: "checkbox" as const, half: true },
];
const dt = (d: Date | null) => (d ? new Date(d.getTime() + 330 * 60000).toISOString().slice(0, 16) : "");

export default async function Promos() {
  const promos = await db.promo.findMany({ orderBy: { createdAt: "desc" } });
  return (
    <div>
      <PageHeader title="Promo codes" actions={<FormDialog trigger="+ Promo" title="New promo code" action={savePromo} initial={{ type: "PERCENT", minOrder: 0, active: true, webOnly: false }} fields={fields} />} />
      <Card>
        <Table head={["Code", "Deal", "Min order", "Used", "Valid", "", ""]}>
          {promos.map((p) => (
            <tr key={p.id}>
              <td className="font-mono font-bold">{p.code}<p className="font-sans text-xs font-normal text-char-400">{p.description}</p></td>
              <td>{p.type === "PERCENT" ? `${p.value}% off` : `Rs ${p.value} off`}{p.maxDiscount ? ` (max Rs ${p.maxDiscount})` : ""}</td>
              <td>Rs {p.minOrder}</td>
              <td>{p.uses}{p.maxUses ? ` / ${p.maxUses}` : ""}</td>
              <td className="text-xs">{p.startsAt ? dt(p.startsAt).replace("T", " ") : "now"} → {p.endsAt ? dt(p.endsAt).replace("T", " ") : "forever"}</td>
              <td>{p.active ? <Badge tone="good">Active</Badge> : <Badge>Off</Badge>} {p.webOnly && <Badge tone="info">web</Badge>}</td>
              <td><FormDialog trigger="Edit" triggerClass="btn-ghost btn-sm" title={`Edit ${p.code}`} action={savePromo} initial={{ ...p, description: p.description ?? "", maxDiscount: p.maxDiscount ?? "", maxUses: p.maxUses ?? "", startsAt: dt(p.startsAt), endsAt: dt(p.endsAt) }} fields={fields} /></td>
            </tr>
          ))}
        </Table>
      </Card>
    </div>
  );
}
