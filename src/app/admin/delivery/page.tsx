import QR from "qrcode";
import Image from "next/image";
import { ActionButton, FormDialog } from "@/components/admin/FormDialog";
import { PrintButton } from "@/components/admin/PrintButton";
import { Card, lkr, PageHeader, Table } from "@/components/admin/ui";
import { rotateTableToken, saveTable, saveZone } from "@/lib/actions/admin";
import { db } from "@/lib/db";

export const metadata = { title: "Delivery & tables" };

export default async function Delivery() {
  const [zones, tables] = await Promise.all([db.deliveryZone.findMany({ orderBy: { sortOrder: "asc" } }), db.diningTable.findMany({ orderBy: { label: "asc" } })]);
  const site = process.env.NEXT_PUBLIC_SITE_URL || "https://hungrybar.lk";
  const qrs = await Promise.all(tables.map((t) => QR.toDataURL(`${site}/t/${t.token}`, { margin: 1, width: 360, color: { dark: "#262626", light: "#FFFFFF" } })));
  const zoneFields = [
    { name: "name", label: "Area", type: "text" as const },
    { name: "fee", label: "Delivery fee (Rs)", type: "number" as const, half: true, hint: "0 = free" },
    { name: "etaMinutes", label: "Typical time (min)", type: "number" as const, half: true },
    { name: "sortOrder", label: "Order", type: "number" as const, half: true },
    { name: "active", label: "Delivering here", type: "checkbox" as const, half: true },
  ];
  const tableFields = [
    { name: "label", label: "Table label", type: "text" as const, half: true },
    { name: "seats", label: "Seats", type: "number" as const, half: true },
    { name: "active", label: "Active", type: "checkbox" as const },
  ];
  return (
    <div>
      <PageHeader title="Delivery & tables" />
      <div className="grid gap-4 xl:grid-cols-[1fr_1.4fr]">
        <Card title="Delivery areas" actions={<FormDialog trigger="+ Area" triggerClass="btn-ghost btn-sm" title="New delivery area" action={saveZone} initial={{ fee: 0, etaMinutes: 40, sortOrder: 50, active: true }} fields={zoneFields} />}>
          <Table head={["Area", "Fee", "ETA", ""]}>
            {zones.map((z) => (
              <tr key={z.id} className={z.active ? "" : "opacity-40"}>
                <td className="font-bold">{z.name}</td>
                <td>{z.fee ? lkr(z.fee) : "FREE"}</td>
                <td>{z.etaMinutes} min</td>
                <td><FormDialog trigger="Edit" triggerClass="btn-ghost btn-sm" title={`Edit ${z.name}`} action={saveZone} initial={z} fields={zoneFields} /></td>
              </tr>
            ))}
          </Table>
        </Card>
        <Card title="Table QR codes" actions={<div className="flex gap-2"><PrintButton label="🖨️ Print QR cards" /><FormDialog trigger="+ Table" triggerClass="btn-ghost btn-sm" title="New table" action={saveTable} initial={{ seats: 4, active: true }} fields={tableFields} /></div>}>
          <p className="mb-3 text-sm text-char-500">Customers scan → menu opens in dine-in mode for that table → order goes straight to the POS & kitchen. If a QR is misused, rotate it to invalidate the old one.</p>
          <div className="print-area grid grid-cols-2 gap-3 md:grid-cols-3">
            {tables.map((t, i) => (
              <div key={t.id} className={`rounded-xl border-2 border-char bg-white p-3 text-center ${t.active ? "" : "opacity-40"}`} style={{ breakInside: "avoid" }}>
                <p className="font-display text-xs uppercase tracking-widest">Hungry Bar</p>
                <p className="font-display text-3xl">Table {t.label}</p>
                <Image src={qrs[i]} alt={`QR for table ${t.label}`} width={180} height={180} unoptimized className="mx-auto" />
                <p className="text-xs font-bold">Scan to order · pay at counter or by card</p>
                <div className="mt-2 flex justify-center gap-1 print:hidden">
                  <FormDialog trigger="Edit" triggerClass="btn-ghost btn-sm" title={`Table ${t.label}`} action={saveTable} initial={t} fields={tableFields} />
                  <ActionButton action={rotateTableToken.bind(null, t.id)} confirm="Make a new QR? The old printed one will stop working.">↻ New QR</ActionButton>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
