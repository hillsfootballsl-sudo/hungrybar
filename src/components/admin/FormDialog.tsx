"use client";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Modal } from "@/components/staff/ui";

export type FieldSpec =
  | { name: string; label: string; type: "text" | "number" | "time" | "date" | "datetime-local" | "password" | "textarea"; hint?: string; placeholder?: string; step?: string; half?: boolean }
  | { name: string; label: string; type: "select"; options: { value: string; label: string }[]; hint?: string; half?: boolean }
  | { name: string; label: string; type: "checkbox"; hint?: string; half?: boolean };

type Action = (v: Record<string, unknown>) => Promise<{ ok: boolean; error?: string }>;

export function FormDialog({
  trigger,
  title,
  fields,
  initial,
  action,
  triggerClass = "btn-primary",
  extra,
}: {
  extra?: Record<string, unknown>;
  trigger: React.ReactNode;
  title: string;
  fields: FieldSpec[];
  initial?: Record<string, unknown>;
  action: Action;
  triggerClass?: string;
}) {
  const [open, setOpen] = useState(false);
  const [vals, setVals] = useState<Record<string, unknown>>({});
  const [err, setErr] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const router = useRouter();

  const openIt = () => {
    const v: Record<string, unknown> = {};
    for (const f of fields) v[f.name] = initial?.[f.name] ?? (f.type === "checkbox" ? true : f.type === "select" ? f.options[0]?.value ?? "" : "");
    setVals(v);
    setErr(null);
    setOpen(true);
  };

  const submit = () =>
    start(async () => {
      const r = await action({ ...(initial?.id ? { id: initial.id } : {}), ...vals, ...(extra ?? {}) });
      if (!r.ok) return setErr(r.error ?? "Failed");
      setOpen(false);
      router.refresh();
    });

  return (
    <>
      <button type="button" className={triggerClass} onClick={openIt}>{trigger}</button>
      <Modal open={open} onClose={() => setOpen(false)} title={title}>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            submit();
          }}
          className="grid grid-cols-2 gap-3"
        >
          {fields.map((f) => (
            <label key={f.name} className={f.half ? "col-span-1" : "col-span-2"}>
              {f.type === "checkbox" ? (
                <span className="flex items-center gap-2 pt-5 text-sm font-bold">
                  <input type="checkbox" className="h-4 w-4 accent-tomato" checked={!!vals[f.name]} onChange={(e) => setVals((v) => ({ ...v, [f.name]: e.target.checked }))} />
                  {f.label}
                </span>
              ) : (
                <>
                  <span className="label">{f.label}</span>
                  {f.type === "select" ? (
                    <select className="input" value={String(vals[f.name] ?? "")} onChange={(e) => setVals((v) => ({ ...v, [f.name]: e.target.value }))}>
                      {f.options.map((o) => (
                        <option key={o.value} value={o.value}>{o.label}</option>
                      ))}
                    </select>
                  ) : f.type === "textarea" ? (
                    <textarea className="input min-h-[80px]" value={String(vals[f.name] ?? "")} placeholder={f.placeholder} onChange={(e) => setVals((v) => ({ ...v, [f.name]: e.target.value }))} />
                  ) : (
                    <input
                      className="input"
                      type={f.type}
                      step={f.step ?? (f.type === "number" ? "any" : undefined)}
                      placeholder={f.placeholder}
                      value={String(vals[f.name] ?? "")}
                      onChange={(e) => setVals((v) => ({ ...v, [f.name]: e.target.value }))}
                    />
                  )}
                </>
              )}
              {f.hint && <span className="mt-1 block text-xs text-char-400">{f.hint}</span>}
            </label>
          ))}
          {err && <p className="col-span-2 rounded-lg bg-tomato-50 p-2 text-sm font-bold text-tomato-700">{err}</p>}
          <div className="col-span-2 mt-2 flex justify-end gap-2">
            <button type="button" className="btn-ghost" onClick={() => setOpen(false)}>Cancel</button>
            <button className="btn-primary" disabled={pending}>{pending ? "Saving…" : "Save"}</button>
          </div>
        </form>
      </Modal>
    </>
  );
}

/** Small inline client button that runs a server action then refreshes */
export function ActionButton({ action, children, className = "btn-ghost btn-sm", confirm }: { action: () => Promise<{ ok: boolean; error?: string }>; children: React.ReactNode; className?: string; confirm?: string }) {
  const [pending, start] = useTransition();
  const router = useRouter();
  return (
    <button
      type="button"
      disabled={pending}
      className={className}
      onClick={() => {
        if (confirm && !window.confirm(confirm)) return;
        start(async () => {
          const r = await action();
          if (!r.ok) alert(r.error);
          router.refresh();
        });
      }}
    >
      {children}
    </button>
  );
}
