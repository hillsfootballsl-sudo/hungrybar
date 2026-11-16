import Link from "next/link";
import { FormDialog } from "@/components/admin/FormDialog";
import { Badge, Card, lkr, PageHeader, Table } from "@/components/admin/ui";
import { saveStaff } from "@/lib/actions/admin";
import { db } from "@/lib/db";
import { fmtDateTime } from "@/lib/time";

export const metadata = { title: "Staff & shifts" };

const ROLES = [
  { value: "OWNER", label: "Owner — everything" },
  { value: "MANAGER", label: "Manager — admin + POS, approves discounts/voids" },
  { value: "CASHIER", label: "Cashier — POS & kitchen" },
  { value: "KITCHEN", label: "Kitchen — kitchen screen only" },
  { value: "RIDER", label: "Rider — delivery app" },
];

export default async function Staff() {
  const [staff, shifts] = await Promise.all([
    db.staff.findMany({ orderBy: [{ active: "desc" }, { role: "asc" }, { name: "asc" }] }),
    db.shift.findMany({ orderBy: { openedAt: "desc" }, take: 30, include: { staff: { select: { name: true } }, _count: { select: { orders: true } } } }),
  ]);
  const fields = [
    { name: "name", label: "Name", type: "text" as const, half: true },
    { name: "phone", label: "Phone", type: "text" as const, half: true },
    { name: "role", label: "Role", type: "select" as const, options: ROLES },
    { name: "pin", label: "4-digit PIN", type: "password" as const, hint: "Leave blank to keep the current PIN", half: true },
    { name: "active", label: "Active", type: "checkbox" as const, half: true },
  ];
  return (
    <div>
      <PageHeader title="Staff & shifts" sub="Each person logs in with their own PIN — every order, discount, void and cash movement is recorded against them." actions={<FormDialog trigger="+ Staff" title="New staff member" action={saveStaff} initial={{ role: "CASHIER", active: true, pin: "" }} fields={fields} />} />
      <div className="grid gap-4 xl:grid-cols-2">
        <Card title="Team">
          <Table head={["Name", "Role", "Phone", ""]}>
            {staff.map((s) => (
              <tr key={s.id} className={s.active ? "" : "opacity-40"}>
                <td className="font-bold">{s.name}</td>
                <td><Badge tone={s.role === "OWNER" ? "bad" : s.role === "MANAGER" ? "warn" : "neutral"}>{s.role}</Badge></td>
                <td>{s.phone ?? "—"}</td>
                <td><FormDialog trigger="Edit" triggerClass="btn-ghost btn-sm" title={`Edit ${s.name}`} action={saveStaff} initial={{ id: s.id, name: s.name, phone: s.phone ?? "", role: s.role, active: s.active, pin: "" }} fields={fields} /></td>
              </tr>
            ))}
          </Table>
          <p className="mt-3 rounded-lg bg-mustard/20 p-3 text-xs">⚠️ The starter PINs (1234 / 1111 / 2222 / 3333) are public in the setup guide — change them before going live.</p>
        </Card>
        <Card title="Recent shifts">
          <Table head={["Opened", "By", "Orders", "Float", "Expected", "Counted", "Diff"]}>
            {shifts.map((s) => {
              const diff = s.closingCash != null && s.expectedCash != null ? s.closingCash - s.expectedCash : null;
              return (
                <tr key={s.id}>
                  <td className="whitespace-nowrap">{fmtDateTime(s.openedAt)}{!s.closedAt && <Badge tone="good">open</Badge>}</td>
                  <td>{s.staff.name}</td>
                  <td><Link className="underline" href={`/admin/orders?day=${s.openedAt.toISOString().slice(0, 10)}`}>{s._count.orders}</Link></td>
                  <td>{lkr(s.openingCash)}</td>
                  <td>{s.expectedCash != null ? lkr(s.expectedCash) : "—"}</td>
                  <td>{s.closingCash != null ? lkr(s.closingCash) : "—"}</td>
                  <td className={diff != null && Math.abs(diff) >= 1 ? "font-bold text-tomato" : ""}>{diff != null ? lkr(diff) : "—"}</td>
                </tr>
              );
            })}
          </Table>
        </Card>
      </div>
    </div>
  );
}
