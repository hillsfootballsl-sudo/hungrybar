import { StackedBars } from "@/components/admin/Charts";
import { ActionButton, FormDialog } from "@/components/admin/FormDialog";
import { Card, lkr, PageHeader, Table } from "@/components/admin/ui";
import { addSectorEntry, deleteSectorEntry } from "@/lib/actions/admin";
import { db } from "@/lib/db";
import { SECTORS, sectorBalances, sectorsByDay } from "@/lib/sectors";
import { addDays, colomboDateKey, fmtDateTime } from "@/lib/time";

export const metadata = { title: "Sectors & money" };

export default async function Sectors({ searchParams }: { searchParams: Promise<{ from?: string; to?: string }> }) {
  const sp = await searchParams;
  const today = colomboDateKey();
  const re = /^\d{4}-\d{2}-\d{2}$/;
  const to = sp.to && re.test(sp.to) ? sp.to : today;
  const from = sp.from && re.test(sp.from) ? sp.from : addDays(to, -13);
  const [days, balances, entries] = await Promise.all([sectorsByDay(from, to), sectorBalances(), db.sectorEntry.findMany({ orderBy: { date: "desc" }, take: 50 })]);
  const totals = SECTORS.map((s) => ({ ...s, v: days.reduce((a, d) => a + d.sectors[s.key], 0) }));
  const revenue = days.reduce((a, d) => a + d.revenue, 0);
  const ranges = [
    { l: "Today", f: today, t: today },
    { l: "7 days", f: addDays(today, -6), t: today },
    { l: "14 days", f: addDays(today, -13), t: today },
    { l: "30 days", f: addDays(today, -29), t: today },
  ];
  return (
    <div>
      <PageHeader
        title="Sectors & money"
        sub="Every bill is split automatically: real recipe food cost, packaging, royalty & charity per pizza, delivery fees, Uber/PickMe commission — and what's left is profit."
        actions={
          <FormDialog
            trigger="+ Record payout"
            title="Money taken out of a sector"
            action={addSectorEntry}
            initial={{ sector: "ROYALTY", amount: "", note: "", date: today }}
            fields={[
              { name: "sector", label: "Sector", type: "select", options: SECTORS.map((s) => ({ value: s.key, label: s.label })) },
              { name: "amount", label: "Amount (Rs)", type: "number", hint: "e.g. royalty transferred, charity donated, supplier paid from food sector. Negative = top-up.", half: true },
              { name: "date", label: "Date", type: "date", half: true },
              { name: "note", label: "Note", type: "text", placeholder: "Royalty transfer for March" },
            ]}
          />
        }
      />
      <form className="mb-4 flex flex-wrap items-end gap-2">
        {ranges.map((r) => (
          <a key={r.l} href={`?from=${r.f}&to=${r.t}`} className={`rounded-lg px-3 py-2 text-sm font-bold ${from === r.f && to === r.t ? "bg-char text-cream" : "bg-white"}`}>{r.l}</a>
        ))}
        <input type="date" name="from" defaultValue={from} className="input w-auto" />
        <input type="date" name="to" defaultValue={to} className="input w-auto" />
        <button className="btn-ghost">Apply</button>
      </form>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-8">
        <div className="card p-3">
          <p className="text-xs font-bold uppercase text-char-400">Revenue</p>
          <p className="font-display text-xl">{lkr(revenue)}</p>
          <p className="text-xs text-char-400">{days.reduce((a, d) => a + d.orders, 0)} orders</p>
        </div>
        {totals.map((s) => (
          <div key={s.key} className="card p-3" style={{ borderTop: `4px solid ${s.color}` }}>
            <p className="text-xs font-bold uppercase text-char-400">{s.label}</p>
            <p className="font-display text-xl">{lkr(s.v)}</p>
            <p className="text-xs text-char-400">{revenue ? `${((s.v / revenue) * 100).toFixed(1)}%` : "—"} · {s.hint}</p>
          </div>
        ))}
      </div>

      <Card title="Daily allocation" className="mt-4">
        <StackedBars days={days.map((d) => ({ x: d.day, values: d.sectors }))} series={SECTORS.map((s) => ({ key: s.key, label: s.label, color: s.color }))} />
      </Card>

      <div className="mt-4 grid gap-4 xl:grid-cols-2">
        <Card title="Set aside per day">
          <Table head={["Day", "Orders", "Revenue", ...SECTORS.map((s) => s.label)]}>
            {[...days].reverse().map((d) => (
              <tr key={d.day}>
                <td className="whitespace-nowrap font-bold">{d.day}</td>
                <td>{d.orders}</td>
                <td>{lkr(d.revenue)}</td>
                {SECTORS.map((s) => (
                  <td key={s.key} className="whitespace-nowrap">{lkr(d.sectors[s.key])}</td>
                ))}
              </tr>
            ))}
          </Table>
        </Card>
        <div className="space-y-4">
          <Card title="Sector balances (all time)">
            <Table head={["Sector", "Collected", "Paid out", "Balance"]}>
              {balances.map((b) => (
                <tr key={b.key}>
                  <td><span className="mr-2 inline-block h-2.5 w-2.5 rounded-sm" style={{ background: b.color }} />{b.label}</td>
                  <td>{lkr(b.collected)}</td>
                  <td>{lkr(b.paidOut)}</td>
                  <td className="font-bold">{lkr(b.balance)}</td>
                </tr>
              ))}
            </Table>
            <p className="mt-2 text-xs text-char-400">Balance = money that belongs to this sector and hasn&apos;t been spent/transferred yet.</p>
          </Card>
          <Card title="Payouts log">
            <Table head={["Date", "Sector", "Amount", "Note", ""]}>
              {entries.map((e) => (
                <tr key={e.id}>
                  <td className="whitespace-nowrap">{fmtDateTime(e.date)}</td>
                  <td>{SECTORS.find((s) => s.key === e.sector)?.label}</td>
                  <td className="font-bold">{lkr(e.amount)}</td>
                  <td className="text-char-500">{e.note}</td>
                  <td><ActionButton action={deleteSectorEntry.bind(null, e.id)} confirm="Delete this entry?" className="text-xs text-tomato">✕</ActionButton></td>
                </tr>
              ))}
            </Table>
          </Card>
        </div>
      </div>
    </div>
  );
}
