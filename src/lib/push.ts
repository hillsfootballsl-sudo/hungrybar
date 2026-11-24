// Web push notifications for order updates (works once the site is installed or allowed in the browser)
import webpush from "web-push";
import { db } from "./db";
import { orderCode } from "./orders";

let configured = false;
function setup() {
  if (configured) return true;
  const pub = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const priv = process.env.VAPID_PRIVATE_KEY;
  if (!pub || !priv) return false;
  webpush.setVapidDetails(process.env.VAPID_SUBJECT || "mailto:orders@hungrybar.lk", pub, priv);
  configured = true;
  return true;
}

const MESSAGES: Record<string, [string, string]> = {
  CONFIRMED: ["Order accepted 👍", "We've got your order and it's going in the oven soon."],
  PREPARING: ["In the oven 🔥", "Your food is being made fresh right now."],
  READY: ["Ready! 📦", "Your order is boxed and hot."],
  OUT_FOR_DELIVERY: ["On the way 🛵", "Our rider is heading to you."],
  COMPLETED: ["Enjoy! 🍕", "Thanks for ordering. Your points have been added."],
  CANCELLED: ["Order cancelled", "Your order was cancelled. Call us if this is unexpected."],
};

export async function sendPush(sub: { id: string; endpoint: string; p256dh: string; auth: string }, payload: object) {
  if (!setup()) return false;
  try {
    await webpush.sendNotification({ endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } }, JSON.stringify(payload), { TTL: 3600 });
    return true;
  } catch (e) {
    const code = (e as { statusCode?: number }).statusCode;
    if (code === 404 || code === 410) await db.pushSubscription.delete({ where: { id: sub.id } }).catch(() => {});
    return false;
  }
}

export async function notifyOrder(orderId: string) {
  if (!setup()) return;
  const o = await db.order.findUnique({ where: { id: orderId }, select: { id: true, number: true, status: true, customerId: true, type: true } });
  if (!o) return;
  const msg = MESSAGES[o.status];
  if (!msg) return;
  if (o.status === "READY" && o.type === "DELIVERY") return; // "on the way" follows
  const subs = await db.pushSubscription.findMany({ where: { OR: [{ orderIds: { has: o.id } }, ...(o.customerId ? [{ customerId: o.customerId }] : [])] } });
  await Promise.all(subs.map((s) => sendPush(s, { title: `${msg[0]} · #${orderCode(o.number)}`, body: msg[1], url: `/order/${o.id}`, tag: `order-${o.id}` })));
}
