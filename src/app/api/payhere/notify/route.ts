import { db } from "@/lib/db";
import { verifyNotify } from "@/lib/payhere";
import { getSetting } from "@/lib/settings";
import { setOrderStatus } from "@/lib/orders";

// PayHere server-to-server notification (form-encoded)
export async function POST(req: Request) {
  const form = await req.formData();
  const p = Object.fromEntries([...form.entries()].map(([k, v]) => [k, String(v)])) as Record<string, string>;
  if (!verifyNotify(p as never)) return new Response("bad signature", { status: 400 });
  const order = await db.order.findUnique({ where: { id: p.order_id } });
  if (!order) return new Response("ok");
  if (Math.abs(parseFloat(p.payhere_amount) - order.total) > 0.01) return new Response("amount mismatch", { status: 400 });
  const code = Number(p.status_code);
  if (code === 2) {
    await db.order.update({ where: { id: order.id }, data: { paymentStatus: "PAID", paidAt: new Date(), paymentRef: p.payment_id } });
    await db.notification.create({ data: { type: "PAYMENT", title: `Card payment received · Rs. ${order.total}`, link: `/admin/orders/${order.id}` } });
    const s = await getSetting("orders");
    if (s.autoAcceptWeb && order.status === "PENDING") await setOrderStatus(order.id, "CONFIRMED", null);
  } else if (code < 0) {
    await db.order.update({ where: { id: order.id }, data: { paymentStatus: "FAILED" } });
  }
  return new Response("ok");
}
