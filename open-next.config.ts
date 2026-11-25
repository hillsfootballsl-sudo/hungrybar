// Cloudflare build settings for the Next.js app (OpenNext adapter).
// No incremental cache is needed: every Hungry Bar page is rendered fresh per request.
import { defineCloudflareConfig } from "@opennextjs/cloudflare";

export default {
  ...defineCloudflareConfig({}),
  // Build Next.js directly. `npm run build` would start the whole Cloudflare build again
  // when it runs in Cloudflare's builder (see scripts/build.mjs).
  buildCommand: "npx next build",
};
