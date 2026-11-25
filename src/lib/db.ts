// Database access. Runs in two places:
//  • Cloudflare Workers (the live site): a fresh client per request, because Workers can't
//    reuse a database connection that another request opened.
//  • Node.js (local development, build scripts, seeding): one shared client.
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";

function connectionString() {
  const raw = process.env.DATABASE_URL;
  if (!raw) throw new Error("DATABASE_URL is not set");
  const u = new URL(raw);
  // Prisma-engine-only options; the Postgres driver doesn't understand them
  u.searchParams.delete("pgbouncer");
  u.searchParams.delete("connection_limit");
  return u.toString();
}

export function createPrisma() {
  const adapter = new PrismaPg({ connectionString: connectionString(), max: 5, idleTimeoutMillis: 5_000, connectionTimeoutMillis: 10_000 });
  return new PrismaClient({ adapter, transactionOptions: { maxWait: 10_000, timeout: 20_000 } });
}

const onWorkers = typeof navigator !== "undefined" && navigator.userAgent === "Cloudflare-Workers";
const perRequest = new WeakMap<object, PrismaClient>();
const g = globalThis as unknown as { __hbPrisma?: PrismaClient };

function client(): PrismaClient {
  if (onWorkers) {
    try {
      const { ctx } = getCloudflareContext();
      let c = perRequest.get(ctx);
      if (!c) {
        c = createPrisma();
        perRequest.set(ctx, c);
      }
      return c;
    } catch {
      return createPrisma();
    }
  }
  g.__hbPrisma ??= createPrisma();
  return g.__hbPrisma;
}

/** Use exactly like a PrismaClient: db.order.findMany(...), db.$transaction(...) */
export const db = new Proxy({} as PrismaClient, {
  get(_target, key) {
    const c = client();
    const v = (c as unknown as Record<string | symbol, unknown>)[key];
    return typeof v === "function" ? (v as (...a: unknown[]) => unknown).bind(c) : v;
  },
});
