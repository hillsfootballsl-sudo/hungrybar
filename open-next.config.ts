// Cloudflare build settings for the Next.js app (OpenNext adapter).
// No incremental cache is needed: every Hungry Bar page is rendered fresh per request.
import { defineCloudflareConfig } from "@opennextjs/cloudflare";

export default defineCloudflareConfig({});
