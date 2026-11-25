// PayHere (Sri Lanka) checkout helpers — https://support.payhere.lk/api-&-mobile-sdk/checkout-api
import { md5Hex } from "./webcrypto";

const md5 = (s: string) => md5Hex(s).toUpperCase();

export function payhereConfigured() {
  return !!(process.env.PAYHERE_MERCHANT_ID && process.env.PAYHERE_MERCHANT_SECRET);
}

export function payhereEndpoint() {
  return process.env.PAYHERE_SANDBOX === "false" ? "https://www.payhere.lk/pay/checkout" : "https://sandbox.payhere.lk/pay/checkout";
}

export function checkoutHash(orderId: string, amount: number, currency = "LKR") {
  const merchantId = process.env.PAYHERE_MERCHANT_ID || "";
  const secret = process.env.PAYHERE_MERCHANT_SECRET || "";
  return md5(merchantId + orderId + amount.toFixed(2) + currency + md5(secret));
}

export function verifyNotify(p: { merchant_id: string; order_id: string; payhere_amount: string; payhere_currency: string; status_code: string; md5sig: string }) {
  const secret = process.env.PAYHERE_MERCHANT_SECRET || "";
  const local = md5(p.merchant_id + p.order_id + p.payhere_amount + p.payhere_currency + p.status_code + md5(secret));
  return local === p.md5sig && p.merchant_id === process.env.PAYHERE_MERCHANT_ID;
}
