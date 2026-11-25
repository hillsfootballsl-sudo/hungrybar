// Web Push sender built on Web Crypto (works on Cloudflare Workers).
// Encryption: RFC 8291 (aes128gcm). Authentication: VAPID, RFC 8292.
import { b64urlDecode, b64urlEncode } from "./webcrypto";

const enc = new TextEncoder();

function concat(...parts: Uint8Array[]) {
  const out = new Uint8Array(parts.reduce((n, p) => n + p.length, 0));
  let o = 0;
  for (const p of parts) {
    out.set(p, o);
    o += p.length;
  }
  return out;
}

async function hkdf(salt: Uint8Array, ikm: Uint8Array, info: Uint8Array, length: number) {
  const key = await crypto.subtle.importKey("raw", ikm, "HKDF", false, ["deriveBits"]);
  return new Uint8Array(await crypto.subtle.deriveBits({ name: "HKDF", hash: "SHA-256", salt, info }, key, length * 8));
}

function ecJwk(publicRaw: Uint8Array, d?: Uint8Array): JsonWebKey {
  return { kty: "EC", crv: "P-256", x: b64urlEncode(publicRaw.slice(1, 33)), y: b64urlEncode(publicRaw.slice(33, 65)), ...(d ? { d: b64urlEncode(d) } : {}), ext: true };
}

export interface EncryptOptions {
  /** fixed sender key pair + salt (tests only) */
  senderPrivate?: Uint8Array;
  senderPublic?: Uint8Array;
  salt?: Uint8Array;
}

/** Encrypt a push message body for one subscription (RFC 8291, single record). */
export async function encryptPayload(payload: Uint8Array, p256dhB64: string, authB64: string, opts: EncryptOptions = {}) {
  const uaPublic = b64urlDecode(p256dhB64);
  const authSecret = b64urlDecode(authB64);
  let asPrivate: CryptoKey;
  let asPublic: Uint8Array;
  if (opts.senderPrivate && opts.senderPublic) {
    asPrivate = await crypto.subtle.importKey("jwk", ecJwk(opts.senderPublic, opts.senderPrivate), { name: "ECDH", namedCurve: "P-256" }, false, ["deriveBits"]);
    asPublic = opts.senderPublic;
  } else {
    const kp = (await crypto.subtle.generateKey({ name: "ECDH", namedCurve: "P-256" }, true, ["deriveBits"])) as CryptoKeyPair;
    asPrivate = kp.privateKey;
    asPublic = new Uint8Array(await crypto.subtle.exportKey("raw", kp.publicKey));
  }
  const uaKey = await crypto.subtle.importKey("raw", uaPublic, { name: "ECDH", namedCurve: "P-256" }, false, []);
  const ecdhSecret = new Uint8Array(await crypto.subtle.deriveBits({ name: "ECDH", public: uaKey }, asPrivate, 256));
  const keyInfo = concat(enc.encode("WebPush: info\0"), uaPublic, asPublic);
  const ikm = await hkdf(authSecret, ecdhSecret, keyInfo, 32);
  const salt = opts.salt ?? crypto.getRandomValues(new Uint8Array(16));
  const cek = await hkdf(salt, ikm, enc.encode("Content-Encoding: aes128gcm\0"), 16);
  const nonce = await hkdf(salt, ikm, enc.encode("Content-Encoding: nonce\0"), 12);
  const aes = await crypto.subtle.importKey("raw", cek, "AES-GCM", false, ["encrypt"]);
  const record = concat(payload, new Uint8Array([2])); // 0x02 = last record, no padding
  const ciphertext = new Uint8Array(await crypto.subtle.encrypt({ name: "AES-GCM", iv: nonce }, aes, record));
  const header = new Uint8Array(21);
  new DataView(header.buffer).setUint32(16, 4096);
  header.set(salt, 0);
  header[20] = asPublic.length;
  return concat(header, asPublic, ciphertext);
}

/** VAPID "Authorization" header value for a push endpoint */
export async function vapidAuthorization(endpoint: string, publicKeyB64: string, privateKeyB64: string, subject: string, nowSec = Math.floor(Date.now() / 1000)) {
  const pub = b64urlDecode(publicKeyB64);
  const key = await crypto.subtle.importKey("jwk", ecJwk(pub, b64urlDecode(privateKeyB64)), { name: "ECDSA", namedCurve: "P-256" }, false, ["sign"]);
  const header = b64urlEncode(enc.encode(JSON.stringify({ typ: "JWT", alg: "ES256" })));
  const body = b64urlEncode(enc.encode(JSON.stringify({ aud: new URL(endpoint).origin, exp: nowSec + 12 * 3600, sub: subject })));
  const sig = new Uint8Array(await crypto.subtle.sign({ name: "ECDSA", hash: "SHA-256" }, key, enc.encode(`${header}.${body}`)));
  return `vapid t=${header}.${body}.${b64urlEncode(sig)}, k=${publicKeyB64}`;
}

export interface PushTarget {
  endpoint: string;
  p256dh: string;
  auth: string;
}

/** Send one notification. Returns the push service's HTTP status (201 = accepted, 404/410 = gone). */
export async function sendWebPush(sub: PushTarget, payload: object, vapid: { publicKey: string; privateKey: string; subject: string }, ttl = 3600) {
  const body = await encryptPayload(enc.encode(JSON.stringify(payload)), sub.p256dh, sub.auth);
  const res = await fetch(sub.endpoint, {
    method: "POST",
    headers: {
      TTL: String(ttl),
      Urgency: "high",
      "Content-Encoding": "aes128gcm",
      "Content-Type": "application/octet-stream",
      Authorization: await vapidAuthorization(sub.endpoint, vapid.publicKey, vapid.privateKey, vapid.subject),
    },
    body,
  });
  return res.status;
}
