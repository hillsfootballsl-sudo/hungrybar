"use client";
import { useEffect, useState } from "react";
import { useStore } from "./StoreProvider";
import { Icon, RewardsMark, Sheet } from "./ui";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export function MonthDay({ value, onChange, id, disabled }: { value: string; onChange: (v: string) => void; id: string; disabled?: boolean }) {
  const [m, d] = value ? value.split("-") : ["", ""];
  const set = (mm: string, dd: string) => onChange(mm && dd ? `${mm}-${dd}` : "");
  return (
    <div className="flex gap-2">
      <select id={id} disabled={disabled} className="input" value={m} onChange={(e) => set(e.target.value, d || "01")} aria-label="Month">
        <option value="">Month</option>
        {MONTHS.map((x, i) => (
          <option key={x} value={String(i + 1).padStart(2, "0")}>{x}</option>
        ))}
      </select>
      <select disabled={disabled} className="input w-28" value={d} onChange={(e) => set(m || "01", e.target.value)} aria-label="Day">
        <option value="">Day</option>
        {Array.from({ length: 31 }, (_, i) => String(i + 1).padStart(2, "0")).map((x) => (
          <option key={x} value={x}>{Number(x)}</option>
        ))}
      </select>
    </div>
  );
}

export function LoginSheet() {
  const s = useStore();
  const [step, setStep] = useState<"phone" | "otp" | "details">("phone");
  const [phone, setPhone] = useState("");
  const [sentTo, setSentTo] = useState("");
  const [code, setCode] = useState("");
  const [devCode, setDevCode] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [birthday, setBirthday] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  useEffect(() => {
    if (s.loginOpen) {
      setStep("phone");
      setCode("");
      setErr(null);
    }
  }, [s.loginOpen]);

  const post = async (url: string, body: unknown, method = "POST") => {
    setBusy(true);
    setErr(null);
    const r = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const j = await r.json().catch(() => ({}));
    setBusy(false);
    if (!r.ok) {
      setErr(j.error ?? "Something went wrong");
      return null;
    }
    return j;
  };

  return (
    <Sheet open={s.loginOpen} onClose={() => s.closeLogin(false)} label="Sign in">
      <div className="pr-10">
        <RewardsMark className="text-2xl" />
        <h2 className="h-title mt-3">{step === "details" ? "Almost there!" : "Sign in or sign up"}</h2>
        <p className="mt-1 text-char-500">
          {step === "details" ? "Tell us a little about you. Birthday = bonus points every year." : `Earn 1 point for every Rs. ${s.config.rewards.rupeesPerPoint} and spend them on free food.`}
        </p>
      </div>
      {step === "phone" && (
        <form className="mt-5 space-y-3" onSubmit={async (e) => { e.preventDefault(); const j = await post("/api/otp/send", { phone }); if (j) { setSentTo(j.phone); setDevCode(j.devCode ?? null); setStep("otp"); } }}>
          <label className="label" htmlFor="login-phone">Mobile number</label>
          <div className="flex gap-2">
            <span className="grid place-items-center rounded-xl border border-char-200 bg-char-50 px-3 font-bold">+94</span>
            <input id="login-phone" className="input" inputMode="tel" autoComplete="tel" placeholder="07X XXX XXXX" value={phone} onChange={(e) => setPhone(e.target.value)} autoFocus />
          </div>
          <button disabled={busy || phone.replace(/\D/g, "").length < 9} className="btn-dark h-13 w-full py-3.5">{busy ? "Sending…" : "Send code"}</button>
          <p className="text-center text-xs text-char-400">We&apos;ll text you a 6-digit code. Standard SMS rates may apply.</p>
        </form>
      )}
      {step === "otp" && (
        <form className="mt-5 space-y-3" onSubmit={async (e) => {
          e.preventDefault();
          const j = await post("/api/otp/verify", { phone: sentTo, code });
          if (!j) return;
          await s.refreshMe();
          if (j.customer.isNew) setStep("details");
          else { s.showToast(`Welcome back${j.customer.name ? `, ${j.customer.name.split(" ")[0]}` : ""}!`); s.closeLogin(true); }
        }}>
          <label className="label" htmlFor="login-otp">Code sent to +{sentTo}</label>
          <input id="login-otp" className="input text-center font-display text-3xl tracking-[.5em]" inputMode="numeric" autoComplete="one-time-code" maxLength={6} value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))} autoFocus />
          {devCode && <p className="rounded-xl bg-mustard/25 p-2 text-center text-xs">Test mode (no SMS provider yet): your code is <b>{devCode}</b></p>}
          <button disabled={busy || code.length < 6} className="btn-primary w-full py-3.5">{busy ? "Checking…" : "Verify"}</button>
          <button type="button" className="w-full text-sm font-bold text-char-500 underline" onClick={() => setStep("phone")}>Change number</button>
        </form>
      )}
      {step === "details" && (
        <form className="mt-5 space-y-3" onSubmit={async (e) => {
          e.preventDefault();
          const j = await post("/api/me", { name, email, birthday }, "PATCH");
          if (!j) return;
          await s.refreshMe();
          s.showToast("You're in! Points start with your first order.");
          s.closeLogin(true);
        }}>
          <div>
            <label className="label" htmlFor="su-name">Your name</label>
            <input id="su-name" className="input" autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} required maxLength={60} />
          </div>
          <div>
            <label className="label" htmlFor="su-email">Email (optional)</label>
            <input id="su-email" className="input" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} maxLength={100} />
          </div>
          <div>
            <label className="label" htmlFor="su-bday">Birthday (optional)</label>
            <MonthDay id="su-bday" value={birthday} onChange={setBirthday} />
            <p className="mt-1 text-xs text-char-400">We drop {s.config.rewards.birthdayBonus} bonus points a week before. You can&apos;t change it later.</p>
          </div>
          <button disabled={busy || !name.trim()} className="btn-primary w-full py-3.5">{busy ? "Saving…" : "Finish"}</button>
        </form>
      )}
      {err && (
        <p className="mt-3 flex items-center gap-2 rounded-xl bg-tomato-50 p-3 text-sm font-bold text-tomato-700">
          <Icon name="info" className="h-4 w-4" /> {err}
        </p>
      )}
    </Sheet>
  );
}
