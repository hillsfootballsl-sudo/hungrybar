// Server-side settings read at request time (on Cloudflare these are the Worker's variables & secrets).
export const siteUrl = () => (process.env.SITE_URL || process.env.NEXT_PUBLIC_SITE_URL || "https://hungrybar.lk").replace(/\/$/, "");
export const vapidKeys = () => {
  const publicKey = process.env.VAPID_PUBLIC_KEY || process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || "";
  const privateKey = process.env.VAPID_PRIVATE_KEY || "";
  return publicKey && privateKey ? { publicKey, privateKey, subject: process.env.VAPID_SUBJECT || "mailto:orders@hungrybar.lk" } : null;
};
