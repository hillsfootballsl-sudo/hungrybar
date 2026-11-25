// `npm run build`
// - In Cloudflare's builder (Workers Builds sets WORKERS_CI=1) this runs the full Cloudflare build
//   (`npm run cf:build`: database migrations, first-time menu, OpenNext bundle). That way the
//   dashboard's default build command works as well as `npm run cf:build`.
// - Anywhere else it is a plain Next.js build.
// OpenNext itself builds Next.js with `buildCommand` from open-next.config.ts, so this never loops.
import { execSync } from "node:child_process";

const inCloudflare = !!process.env.WORKERS_CI;
const command = inCloudflare ? "npm run cf:build" : "prisma generate && next build";
if (inCloudflare) console.log("Cloudflare build detected: running npm run cf:build");
execSync(command, { stdio: "inherit" });
