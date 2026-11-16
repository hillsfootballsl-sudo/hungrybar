// SMS sending for OTPs and owner alerts.
// Providers: "console" (dev — logs only), "notifylk" (https://notify.lk), "textlk" (https://text.lk)

export function normalizePhone(input: string): string | null {
  const digits = (input || "").replace(/\D/g, "");
  let d = digits;
  if (d.startsWith("0094")) d = d.slice(2);
  if (d.startsWith("0") && d.length === 10) d = "94" + d.slice(1);
  if (d.length === 9 && d.startsWith("7")) d = "94" + d;
  if (/^947\d{8}$/.test(d)) return d;
  return null;
}

export function prettyPhone(p?: string | null) {
  if (!p) return "";
  const d = p.replace(/\D/g, "");
  if (d.length === 11 && d.startsWith("94")) return `0${d.slice(2, 4)} ${d.slice(4, 7)} ${d.slice(7)}`;
  return p;
}

export async function sendSms(to: string, message: string): Promise<{ ok: boolean; error?: string }> {
  const provider = process.env.SMS_PROVIDER || "console";
  const phone = normalizePhone(to);
  if (!phone) return { ok: false, error: "Invalid phone number" };
  try {
    if (provider === "notifylk") {
      const url = new URL("https://app.notify.lk/api/v1/send");
      url.searchParams.set("user_id", process.env.NOTIFYLK_USER_ID || "");
      url.searchParams.set("api_key", process.env.NOTIFYLK_API_KEY || "");
      url.searchParams.set("sender_id", process.env.NOTIFYLK_SENDER_ID || "NotifyDEMO");
      url.searchParams.set("to", phone);
      url.searchParams.set("message", message);
      const r = await fetch(url, { method: "GET" });
      const j = (await r.json().catch(() => ({}))) as { status?: string };
      return { ok: r.ok && j.status === "success", error: r.ok ? undefined : `notify.lk ${r.status}` };
    }
    if (provider === "textlk") {
      const r = await fetch("https://app.text.lk/api/v3/sms/send", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.TEXTLK_API_TOKEN || ""}`,
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({ recipient: phone, sender_id: process.env.TEXTLK_SENDER_ID || "TextLKDemo", type: "plain", message }),
      });
      return { ok: r.ok, error: r.ok ? undefined : `text.lk ${r.status}` };
    }
    console.log(`[sms:console] -> ${phone}: ${message}`);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}
