"use client";
import { useState, useTransition } from "react";
import { saveSettings } from "@/lib/actions/admin";
import type { HoursSettings, OrderSettings, RewardsSettings, ShopSettings } from "@/lib/settings";

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

function useSection<T>(key: "shop" | "hours" | "orders" | "rewards", init: T) {
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

export function SettingsForm({ shop, hours, orders, rewards, packaging }: { shop: ShopSettings; hours: HoursSettings; orders: OrderSettings; rewards: RewardsSettings; packaging: { id: string; name: string }[] }) {
  const s = useSection("shop", shop);
  const h = useSection("hours", hours);
  const o = useSection("orders", orders);
  const l = useSection("rewards", rewards);
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
        <T label="Opens" type="time" value={h.v.open} onChange={(v) => h.set({ open: v })} />
        <T label="Closes" value={h.v.close} onChange={(v) => h.set({ close: v })} hint="24:00 = midnight" />
        <T label="Note" value={h.v.note} onChange={(v) => h.set({ note: v })} wide />
        <p className="text-xs text-char-400 md:col-span-2">Each menu category also has its own serving hours (Menu → Edit category). Online orders outside these hours must be scheduled.</p>
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
      <Section title="Hungry Rewards (points)" onSave={l.save} dirty={l.dirty} pending={l.pending} msg={l.msg}>
        <label className="flex items-center gap-2 text-sm font-bold md:col-span-2"><input type="checkbox" className="accent-tomato" checked={l.v.enabled} onChange={(e) => l.set({ enabled: e.target.checked })} /> Points programme switched on</label>
        <T label="Programme name" value={l.v.programName} onChange={(v) => l.set({ programName: v })} />
        <T label="Points name" value={l.v.pointName} onChange={(v) => l.set({ pointName: v })} />
        <T label="Spend Rs … to earn 1 point" type="number" value={l.v.rupeesPerPoint} onChange={(v) => l.set({ rupeesPerPoint: Math.max(1, Number(v)) })} hint="10 = 1 point per Rs 10" />
        <T label="Points expire after (months)" type="number" value={l.v.expiryMonths} onChange={(v) => l.set({ expiryMonths: Math.max(1, Number(v)) })} />
        <T label="Welcome bonus (after first order)" type="number" value={l.v.welcomeBonus} onChange={(v) => l.set({ welcomeBonus: Math.max(0, Number(v)) })} />
        <T label="Birthday bonus" type="number" value={l.v.birthdayBonus} onChange={(v) => l.set({ birthdayBonus: Math.max(0, Number(v)) })} />
        <T label="Anniversary bonus" type="number" value={l.v.anniversaryBonus} onChange={(v) => l.set({ anniversaryBonus: Math.max(0, Number(v)) })} />
        <T label="Bonus points valid for (days)" type="number" value={l.v.bonusValidDays} onChange={(v) => l.set({ bonusValidDays: Math.max(1, Number(v)) })} />
        <T label="Send birthday bonus … days before" type="number" value={l.v.bonusDaysBefore} onChange={(v) => l.set({ bonusDaysBefore: Math.max(0, Number(v)) })} />
        <p className="text-xs text-char-400 md:col-span-2">The rewards menu (what points can buy) is in Admin → Customers & rewards.</p>
      </Section>
    </div>
  );
}
