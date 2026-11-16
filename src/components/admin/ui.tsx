import Link from "next/link";

export function PageHeader({ title, sub, actions }: { title: string; sub?: React.ReactNode; actions?: React.ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="font-condensed text-4xl uppercase leading-none">{title}</h1>
        {sub && <p className="mt-1 text-sm text-char-500">{sub}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

export function Stat({ label, value, sub, tone }: { label: string; value: React.ReactNode; sub?: React.ReactNode; tone?: "good" | "bad" }) {
  return (
    <div className="card p-4">
      <p className="text-xs font-bold uppercase tracking-wider text-char-400">{label}</p>
      <p className="mt-1 font-display text-2xl">{value}</p>
      {sub && <p className={`mt-0.5 text-xs ${tone === "good" ? "text-basil" : tone === "bad" ? "text-tomato" : "text-char-400"}`}>{sub}</p>}
    </div>
  );
}

export function Card({ title, actions, children, className = "" }: { title?: React.ReactNode; actions?: React.ReactNode; children: React.ReactNode; className?: string }) {
  return (
    <section className={`card ${className}`}>
      {(title || actions) && (
        <div className="flex items-center justify-between gap-3 border-b border-char-100 px-4 py-3">
          <h2 className="font-bold">{title}</h2>
          {actions}
        </div>
      )}
      <div className="p-4">{children}</div>
    </section>
  );
}

export function Table({ head, children, className = "" }: { head: React.ReactNode[]; children: React.ReactNode; className?: string }) {
  return (
    <div className={`overflow-x-auto ${className}`}>
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-char-100 text-left text-xs uppercase tracking-wide text-char-400">
            {head.map((h, i) => (
              <th key={i} className="whitespace-nowrap px-3 py-2 font-bold">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-char-50 [&_td]:px-3 [&_td]:py-2">{children}</tbody>
      </table>
    </div>
  );
}

export function Badge({ children, tone = "neutral" }: { children: React.ReactNode; tone?: "neutral" | "good" | "warn" | "bad" | "info" }) {
  const c = { neutral: "bg-char-50 text-char-600", good: "bg-basil/15 text-basil-600", warn: "bg-mustard/25 text-char-700", bad: "bg-tomato-50 text-tomato-700", info: "bg-sky-100 text-sky-800" }[tone];
  return <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-bold ${c}`}>{children}</span>;
}

export function Tabs({ items, active }: { items: { href: string; label: string }[]; active: string }) {
  return (
    <div className="mb-4 flex flex-wrap gap-1">
      {items.map((i) => (
        <Link key={i.href} href={i.href} className={`rounded-lg px-3 py-1.5 text-sm font-bold ${active === i.href ? "bg-char text-cream" : "bg-white text-char-500 hover:bg-char-50"}`}>
          {i.label}
        </Link>
      ))}
    </div>
  );
}

export function Field({ label, children, hint }: { label: string; children: React.ReactNode; hint?: string }) {
  return (
    <label className="block">
      <span className="label">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-xs text-char-400">{hint}</span>}
    </label>
  );
}

export const lkr = (n: number) => "Rs. " + Math.round(n).toLocaleString("en-US");
