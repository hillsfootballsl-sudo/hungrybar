// Cloudflare Worker entry: the Next.js app (built by OpenNext) plus the nightly scheduled job.
import { default as app } from "./.open-next/worker.js";

export default {
  fetch: app.fetch,
  // Cron trigger (see wrangler.jsonc): expire old points and give birthday bonuses
  async scheduled(_controller, env, ctx) {
    const req = new Request("https://hungrybar.internal/api/cron/daily", { headers: { authorization: `Bearer ${env.CRON_SECRET}` } });
    ctx.waitUntil(app.fetch(req, env, ctx));
  },
};
