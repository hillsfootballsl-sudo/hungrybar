// Sri Lanka is UTC+05:30 all year (no DST). All business-day maths uses this offset.
export const TZ_OFFSET_MIN = 330;

export function colomboParts(d: Date = new Date()) {
  const shifted = new Date(d.getTime() + TZ_OFFSET_MIN * 60000);
  return {
    y: shifted.getUTCFullYear(),
    m: shifted.getUTCMonth() + 1,
    d: shifted.getUTCDate(),
    minutes: shifted.getUTCHours() * 60 + shifted.getUTCMinutes(),
    dow: shifted.getUTCDay(),
  };
}

/** "YYYY-MM-DD" in Colombo time */
export function colomboDateKey(d: Date = new Date()) {
  const p = colomboParts(d);
  return `${p.y}-${String(p.m).padStart(2, "0")}-${String(p.d).padStart(2, "0")}`;
}

/** UTC Date for 00:00 Colombo time on the given "YYYY-MM-DD" */
export function startOfColomboDay(key: string) {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d, 0, 0) - TZ_OFFSET_MIN * 60000);
}

export function addDays(key: string, n: number) {
  const t = startOfColomboDay(key).getTime() + n * 86400000;
  return colomboDateKey(new Date(t));
}

export function hm(s: string) {
  const [h, m] = s.split(":").map(Number);
  return h * 60 + (m || 0);
}

export function isOpenAt(from: string, to: string, minutes: number) {
  const a = hm(from);
  const b = hm(to);
  if (a === b) return true;
  if (a < b) return minutes >= a && minutes < b;
  return minutes >= a || minutes < b; // crosses midnight
}

export function fmtTime12(s: string) {
  let m = hm(s) % 1440;
  const h = Math.floor(m / 60);
  m = m % 60;
  const ap = h >= 12 ? "pm" : "am";
  const h12 = h % 12 === 0 ? 12 : h % 12;
  if (s === "24:00") return "12 midnight";
  return `${h12}${m ? ":" + String(m).padStart(2, "0") : ""}${ap}`;
}

export function fmtDateTime(d: Date | string) {
  const date = typeof d === "string" ? new Date(d) : d;
  return date.toLocaleString("en-GB", {
    timeZone: "Asia/Colombo",
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
}

export function fmtClock(d: Date | string) {
  const date = typeof d === "string" ? new Date(d) : d;
  return date.toLocaleTimeString("en-GB", { timeZone: "Asia/Colombo", hour: "2-digit", minute: "2-digit", hour12: true });
}
