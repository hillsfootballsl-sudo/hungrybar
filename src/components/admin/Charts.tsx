"use client";
import { useState } from "react";

const fmt = (n: number) => "Rs. " + Math.round(n).toLocaleString("en-US");
const short = (n: number) => (Math.abs(n) >= 1000 ? `${(n / 1000).toFixed(n >= 10000 ? 0 : 1)}k` : String(Math.round(n)));
const dayLabel = (d: string) => new Date(d + "T00:00:00").toLocaleDateString("en-GB", { day: "numeric", month: "short" });

function niceMax(v: number) {
  if (v <= 0) return 1;
  const p = Math.pow(10, Math.floor(Math.log10(v)));
  return Math.ceil(v / p / 2) * 2 * p;
}

/** Single-series bar chart (e.g. revenue per day) */
export function BarChart({ data, color = "#EE4224", label }: { data: { x: string; y: number; sub?: string }[]; color?: string; label: string }) {
  const [hover, setHover] = useState<number | null>(null);
  const [table, setTable] = useState(false);
  const W = 640, H = 220, L = 44, B = 26, T = 10;
  const max = niceMax(Math.max(...data.map((d) => d.y), 0));
  const bw = (W - L) / data.length;
  const y = (v: number) => T + (H - T - B) * (1 - v / max);
  if (table)
    return (
      <div>
        <button onClick={() => setTable(false)} className="mb-2 text-xs font-bold text-char-400 underline">Show chart</button>
        <div className="max-h-64 overflow-y-auto text-sm">
          {data.map((d) => (
            <div key={d.x} className="flex justify-between border-b border-char-50 py-1"><span>{dayLabel(d.x)}</span><span className="font-bold">{fmt(d.y)}</span></div>
          ))}
        </div>
      </div>
    );
  return (
    <div className="relative">
      <button onClick={() => setTable(true)} className="absolute right-0 top-0 z-10 text-xs font-bold text-char-400 underline">Table</button>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label={label} onMouseLeave={() => setHover(null)}>
        {[0, 0.5, 1].map((f) => (
          <g key={f}>
            <line x1={L} x2={W} y1={y(max * f)} y2={y(max * f)} stroke="#E6E6E6" strokeWidth={1} />
            <text x={L - 6} y={y(max * f) + 4} textAnchor="end" fontSize={11} fill="#6E6E6E">{short(max * f)}</text>
          </g>
        ))}
        {data.map((d, i) => {
          const h = Math.max(0, H - B - y(d.y));
          const x = L + i * bw + 2;
          const w = Math.max(2, bw - 4);
          return (
            <g key={d.x} onMouseEnter={() => setHover(i)} onTouchStart={() => setHover(i)}>
              <rect x={L + i * bw} y={T} width={bw} height={H - T - B} fill="transparent" />
              {h > 0 && <path d={`M${x},${H - B} V${H - B - h + Math.min(4, h)} q0,-4 4,-4 H${x + w - 4} q4,0 4,4 V${H - B} Z`} fill={color} opacity={hover == null || hover === i ? 1 : 0.45} />}
              {(i % Math.ceil(data.length / 7) === 0 || i === data.length - 1) && (
                <text x={x + w / 2} y={H - 8} textAnchor="middle" fontSize={11} fill="#6E6E6E">{dayLabel(d.x)}</text>
              )}
            </g>
          );
        })}
        <line x1={L} x2={W} y1={H - B} y2={H - B} stroke="#C9C9C9" />
      </svg>
      {hover != null && data[hover] && (
        <div className="pointer-events-none absolute top-2 rounded-lg bg-char px-3 py-2 text-xs text-cream shadow-lg" style={{ left: `min(calc(${((L + hover * bw + bw / 2) / W) * 100}% + 8px), calc(100% - 150px))` }}>
          <p className="font-bold">{dayLabel(data[hover].x)}</p>
          <p>{fmt(data[hover].y)}</p>
          {data[hover].sub && <p className="text-cream/60">{data[hover].sub}</p>}
        </div>
      )}
    </div>
  );
}

/** Stacked bars of sector allocations per day, with legend + hover breakdown */
export function StackedBars({ days, series }: { days: { x: string; values: Record<string, number> }[]; series: { key: string; label: string; color: string }[] }) {
  const [hover, setHover] = useState<number | null>(null);
  const [table, setTable] = useState(false);
  const W = 640, H = 240, L = 44, B = 26, T = 10;
  const totals = days.map((d) => series.reduce((s, x) => s + Math.max(0, d.values[x.key] ?? 0), 0));
  const max = niceMax(Math.max(...totals, 0));
  const bw = (W - L) / Math.max(1, days.length);
  const sc = (v: number) => ((H - T - B) * v) / max;
  return (
    <div className="relative">
      <div className="mb-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs">
        {series.map((s) => (
          <span key={s.key} className="flex items-center gap-1.5 text-char-600"><span className="h-2.5 w-2.5 rounded-sm" style={{ background: s.color }} />{s.label}</span>
        ))}
        <button onClick={() => setTable((t) => !t)} className="ml-auto font-bold text-char-400 underline">{table ? "Show chart" : "Table"}</button>
      </div>
      {table ? (
        <div className="max-h-72 overflow-auto">
          <table className="w-full text-xs">
            <thead><tr className="text-left text-char-400"><th className="py-1">Day</th>{series.map((s) => <th key={s.key} className="px-1 text-right">{s.label}</th>)}</tr></thead>
            <tbody>
              {days.map((d) => (
                <tr key={d.x} className="border-t border-char-50"><td className="py-1">{dayLabel(d.x)}</td>{series.map((s) => <td key={s.key} className="px-1 text-right">{Math.round(d.values[s.key] ?? 0).toLocaleString()}</td>)}</tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <>
          <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label="Sector allocation per day" onMouseLeave={() => setHover(null)}>
            {[0, 0.5, 1].map((f) => (
              <g key={f}>
                <line x1={L} x2={W} y1={T + (H - T - B) * (1 - f)} y2={T + (H - T - B) * (1 - f)} stroke="#E6E6E6" />
                <text x={L - 6} y={T + (H - T - B) * (1 - f) + 4} textAnchor="end" fontSize={11} fill="#6E6E6E">{short(max * f)}</text>
              </g>
            ))}
            {days.map((d, i) => {
              let acc = H - B;
              const x = L + i * bw + 2;
              const w = Math.max(2, bw - 4);
              const segs = series.map((s) => {
                const h = sc(Math.max(0, d.values[s.key] ?? 0));
                const top = acc - h;
                acc = top;
                return { s, top, h };
              });
              const lastIdx = segs.map((g) => g.h > 0).lastIndexOf(true);
              return (
                <g key={d.x} onMouseEnter={() => setHover(i)} onTouchStart={() => setHover(i)} opacity={hover == null || hover === i ? 1 : 0.5}>
                  <rect x={L + i * bw} y={T} width={bw} height={H - T - B} fill="transparent" />
                  {segs.map((g, k) =>
                    g.h > 0 ? (
                      k === lastIdx ? (
                        <path key={g.s.key} d={`M${x},${g.top + g.h} V${g.top + Math.min(4, g.h)} q0,-4 4,-4 H${x + w - 4} q4,0 4,4 V${g.top + g.h} Z`} fill={g.s.color} stroke="#fff" strokeWidth={1} />
                      ) : (
                        <rect key={g.s.key} x={x} y={g.top} width={w} height={g.h} fill={g.s.color} stroke="#fff" strokeWidth={1} />
                      )
                    ) : null,
                  )}
                  {(i % Math.ceil(days.length / 7) === 0 || i === days.length - 1) && <text x={x + w / 2} y={H - 8} textAnchor="middle" fontSize={11} fill="#6E6E6E">{dayLabel(d.x)}</text>}
                </g>
              );
            })}
            <line x1={L} x2={W} y1={H - B} y2={H - B} stroke="#C9C9C9" />
          </svg>
          {hover != null && days[hover] && (
            <div className="pointer-events-none absolute top-8 z-10 w-52 rounded-lg bg-char p-3 text-xs text-cream shadow-lg" style={{ left: `min(calc(${((L + hover * bw + bw) / W) * 100}% + 8px), calc(100% - 210px))` }}>
              <p className="mb-1 font-bold">{dayLabel(days[hover].x)} · {fmt(totals[hover])}</p>
              {[...series].reverse().map((s) => (
                <p key={s.key} className="flex items-center justify-between gap-2">
                  <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-sm" style={{ background: s.color }} />{s.label}</span>
                  <span>{fmt(days[hover].values[s.key] ?? 0)}</span>
                </p>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
