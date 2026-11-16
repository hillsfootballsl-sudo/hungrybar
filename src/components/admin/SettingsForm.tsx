"use client";
import { useState, useTransition } from "react";
import { saveSettings } from "@/lib/actions/admin";
import type { HoursSettings, LoyaltySettings, OrderSettings, ShopSettings } from "@/lib/settings";

function Section({ title, children, onSave, dirty, pending, msg }: { title: string; children: React.ReactNode; onSave: () => void; dirty: boolean; pending: boolean; msg?: string | null }) {
  return (
    <section className="card p-4">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="font-bold">{title}</h2>
        <div className="flex items-center gap-2">
          {msg && <span className="text-xs text-char-400">{msg}</span>}
          <button className="btn-primary btn-sm" disabled={!dirty || pending} onClick={onSave}>{pending ? "Saving…" : dirty ? "Save" : "Saved"}</button>
        </div>
      </div>
      <div className="grid gap-3 md:grid-cols-2">{children}</div>
    </section>
  );
}

function useSection<T>(key: "shop" | "hours" | "orders" | "loyalty", init: T) {
  const [v, setV] = useState(init);
  const [dirty, setDirty] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [pending, start] = useTransition();
  return {
    v,
    set: (p: Partial<T>) => {
      setV((x) => ({ ...x, ...p }));
      setDirty(true);
    },
    dirty,
    pending,
    msg,
    save: () =>
      start(async () => {
        const r = await saveSettings(key, v);
        setMsg(r.ok ? "Saved ✓" : r.error);
        if (r.ok) setDirty(false);
      }),
  };
}

const T = ({ label, value, onChange, type = "text", hint, wide }: { label: string; value: string | number; onChange: (v: string) => void; type?: string; hint?: string; wide?: boolean }) => (
  <label className={wide ? "md:col-span-2" : ""}>
    <span className="label">{label}</span>
    <input className="input" type={type} value={value} onChange={(e) => onChange(e.target.value)} />
    {hint && <span className="mt-1 block text-xs text-char-400">{hint}</span>}
  </label>
);

export function SettingsForm({ shop, hours, orders, loyalty, sizes, packaging }: { shop: ShopSettings; hours: HoursSettings; orders: OrderSettings; loyalty: LoyaltySettings; sizes: { id: string; name: string }[]; packaging: { id: string; name: string }[] }) {
  const s = useSection("shop", shop);
  const h = useSection("hours", hours);
  const o = useSection("orders", orders);
  const l = useSection("loyalty", loyalty);
  return (
    <div className="grid gap-4 xl:grid-cols-2">
      <Section title="Shop details" onSave={s.save} dirty={s.dirty} pending={s.pending} msg={s.msg}>
        <T label="Name" value={s.v.name} onChange={(v) => s.set({ name: v })} />
        <T label="Tagline" value={s.v.tagline} onChange={(v) => s.set({ tagline: v })} />
        <T label="Address" value={s.v.address} onChange={(v) => s.set({ address: v })} wide />
        <T label="Phone" value={s.v.phone} onChange={(v) => s.set({ phone: v })} />
        <T label="WhatsApp (digits, e.g. 94701414516)" value={s.v.whatsapp} onChange={(v) => s.set({ whatsapp: v.replace(/\D/g, "") })} />
        <T label="Instagram handle" value={s.v.instagram} onChange={(v) => s.set({ instagram: v.replace("@", "") })} />
        <T label="Google Maps link" value={s.v.mapUrl} onChange={(v) => s.set({ mapUrl: v })} />
        <T label="Established" value={s.v.since} onChange={(v) => s.set({ since: v })} />
        <label className="flex items-center gap-2 pt-6 text-sm font-bold"><input type="checkbox" className="accent-tomato" checked={s.v.halal} onChange={(e) => s.set({ halal: e.target.checked })} /> Show 100% Halal badge</label>
      </Section>
      <Section title="Opening hours (shown on website)" onSave={h.save} dirty={h.dirty} pending={h.pending} msg={h.msg}>
        <T label="Café opens" type="time" value={h.v.cafe.open} onChange={(v) => h.set({ cafe: { ...h.v.cafe, open: v } })} />
        <T label="Café closes" type="time" value={h.v.cafe.close} onChange={(v) => h.set({ cafe: { ...h.v.cafe, close: v } })} />
        <T label="Pizza opens" type="time" value={h.v.pizza.open} onChange={(v) => h.set({ pizza: { ...h.v.pizza, open: v } })} />
        <T label="Pizza closes" value={h.v.pizza.close} onChange={(v) => h.set({ pizza: { ...h.v.pizza, close: v } })} hint="24:00 = midnight" />
        <p className="text-xs text-char-400 md:col-span-2">Which items can be ordered when is set per menu category (Menu → Edit category).</p>
      </Section>
      <Section title="Ordering" onSave={o.save} dirty={o.dirty} pending={o.pending} msg={o.msg}>
        <label className="flex items-center gap-2 text-sm font-bold"><input type="checkbox" className="accent-tomato" checked={o.v.acceptingOnline} onChange={(e) => o.set({ acceptingOnline: e.target.checked })} /> Accepting online orders</label>
        <label className="flex items-center gap-2 text-sm font-bold"><input type="checkbox" className="accent-tomato" checked={o.v.autoAcceptWeb} onChange={(e) => o.set({ autoAcceptWeb: e.target.checked })} /> Auto-accept online orders</label>
        <T label="Uber Eats commission %" type="number" value={o.v.platformCommission.UBER} onChange={(v) => o.set({ platformCommission: { ...o.v.platformCommission, UBER: Number(v) } })} />
        <T label="PickMe Food commission %" type="number" value={o.v.platformCommission.PICKME} onChange={(v) => o.set({ platformCommission: { ...o.v.platformCommission, PICKME: Number(v) } })} />
        <label>
          <span className="label">Carry bag stock item</span>
          <select className="input" value={o.v.bagIngredientId ?? ""} onChange={(e) => o.set({ bagIngredientId: e.target.value || null })}>
            <option value="">— none —</option>
            {packaging.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </label>
        <T label="Bags per takeaway/delivery order" type="number" value={o.v.bagsPerOrder} onChange={(v) => o.set({ bagsPerOrder: Number(v) })} />
        <T label="Prep time (minutes, for pickup ETA)" type="number" value={o.v.prepMinutes} onChange={(v) => o.set({ prepMinutes: Number(v) })} />
        <T label="Owner phone for low-stock SMS" value={o.v.ownerAlertPhone} onChange={(v) => o.set({ ownerAlertPhone: v })} hint="Needs an SMS provider configured" />
      </Section>
      <Section title="Rewards" onSave={l.save} dirty={l.dirty} pending={l.pending} msg={l.msg}>
        <label className="flex items-center gap-2 text-sm font-bold"><input type="checkbox" className="accent-tomato" checked={l.v.enabled} onChange={(e) => l.set({ enabled: e.target.checked })} /> Stamp card enabled</label>
        <T label="Free pizza on every Nth order" type="number" value={l.v.stampsRequired} onChange={(v) => l.set({ stampsRequired: Math.max(2, Number(v)) })} />
        <label className="md:col-span-2">
          <span className="label">Free pizza size</span>
          <select className="input" value={l.v.rewardSizeId ?? ""} onChange={(e) => l.set({ rewardSizeId: e.target.value || null })}>
            <option value="">Any size (most expensive pizza in the order)</option>
            {sizes.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}
          </select>
          <span className="mt-1 block text-xs text-char-400">Free = the pizza&apos;s base price; extra toppings are still charged.</span>
        </label>
      </Section>
    </div>
  );
}
