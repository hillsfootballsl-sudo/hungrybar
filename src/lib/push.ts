// Order-status notifications to customers' phones (Web Push)
import { db } from "./db";
import { vapidKeys } from "./env";
import { orderCode } from "./orders";
import { sendWebPush } from "./webpush";

const MESSAGES: Record<string, [string, string]> = {
  CONFIRMED: ["Order accepted 👍", "We've got your order and it's going in the oven soon."],
  PREPARING: ["In the oven 🔥", "Your food is being made fresh right now."],
  READY: ["Ready! 📦", "Your order is boxed and hot."],
  OUT_FOR_DELIVERY: ["On the way 🛵", "Our rider is heading to you."],
  COMPLETED: ["Enjoy! 🍕", "Thanks for ordering. Your points have been added."],
  CANCELLED: ["Order cancelled", "Your order was cancelled. Call us if this is unexpected."],
};

export async function sendPush(sub: { id: string; endpoint: string; p256dh: string; auth: string }, payload: object) {
  const vapid = vapidKeys();
  if (!vapid) return false;
  try {
    const status = await sendWebPush(sub, payload, vapid);
    if (status === 404 || status === 410) await db.pushSubscription.delete({ where: { id: sub.id } }).catch(() => {});
    return status >= 200 && status < 300;
  } catch {
    return false;
  }
}

export async function notifyOrder(orderId: string) {
  if (!vapidKeys()) return;
  const o = await db.order.findUnique({ where: { id: orderId }, select: { id: true, number: true, status: true, customerId: true, type: true } });
  if (!o) return;
  const msg = MESSAGES[o.status];
  if (!msg) return;
  if (o.status === "READY" && o.type === "DELIVERY") return; // "on the way" follows
  const subs = await db.pushSubscription.findMany({ where: { OR: [{ orderIds: { has: o.id } }, ...(o.customerId ? [{ customerId: o.customerId }] : [])] } });
  await Promise.all(subs.map((s) => sendPush(s, { title: `${msg[0]} · #${orderCode(o.number)}`, body: msg[1], url: `/order/${o.id}`, tag: `order-${o.id}` })));
}
