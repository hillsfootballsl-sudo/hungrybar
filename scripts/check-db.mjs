// First step of `npm run cf:build`: checks DATABASE_URL and DIRECT_URL and explains any problem
// in plain words (Prisma's own errors are short and technical). Never prints the password.
import pg from "pg";

const REGIONS = {
  "ap-south-1": "Mumbai",
  "ap-southeast-1": "Singapore",
  "ap-southeast-2": "Sydney",
  "ap-northeast-1": "Tokyo",
  "ap-northeast-2": "Seoul",
  "eu-central-1": "Frankfurt",
  "eu-west-1": "Ireland",
  "eu-west-2": "London",
  "us-east-1": "N. Virginia",
  "us-west-1": "N. California",
};
const WHERE = "Cloudflare → hungrybar → Settings → Build → Variables and secrets";
const problems = [];
const warnings = [];

function inspect(name, wantPort) {
  let v = (process.env[name] ?? "").trim();
  if (!v) {
    problems.push(`${name} is missing. Add it as a Secret under ${WHERE}.`);
    return null;
  }
  if (v.startsWith(`${name}=`)) {
    problems.push(`${name}: paste only the part starting with postgresql:// (without "${name}=" in front).`);
    v = v.slice(name.length + 1);
  }
  if (/^["'`]|["'`]$/.test(v)) {
    problems.push(`${name} has quote marks around it. Paste it without the " " quotes.`);
    v = v.replace(/^["'`]+|["'`]+$/g, "");
  }
  if (!/^postgres(ql)?:\/\//i.test(v)) {
    problems.push(`${name} should start with postgresql:// — copy it again from Supabase → Connect → ORMs → Prisma.`);
    return null;
  }
  if (/YOUR-PASSWORD/i.test(v)) {
    problems.push(`${name} still contains [YOUR-PASSWORD]. Replace it (brackets included) with your database password.`);
  }
  const rest = v.replace(/^postgres(ql)?:\/\//i, "");
  const at = rest.lastIndexOf("@");
  if (at < 0) {
    problems.push(`${name} has no user name and password in it. Copy it again from Supabase → Connect → ORMs → Prisma.`);
    return null;
  }
  const userinfo = rest.slice(0, at);
  const hostPart = rest.slice(at + 1);
  const colon = userinfo.indexOf(":");
  const user = colon < 0 ? userinfo : userinfo.slice(0, colon);
  const password = colon < 0 ? "" : userinfo.slice(colon + 1);
  const m = hostPart.match(/^([^:/?#]+)(?::(\d+))?/);
  const host = (m?.[1] ?? "").toLowerCase();
  const port = m?.[2] ?? "5432";

  const supabaseHost = /supabase\.(com|co)$/.test(host);
  if (!password && supabaseHost) problems.push(`${name} has no password in it.`);
  if (/[#?/\s]/.test(password) || /%(?![0-9a-f]{2})/i.test(password)) {
    problems.push(`${name}: the password contains symbols that break the link. Use the helper page (it encodes them) or a password of only letters and numbers.`);
  }
  if (/^db\.[a-z0-9]+\.supabase\.co$/.test(host)) {
    problems.push(`${name} uses Supabase's "Direct connection" (${host}), which Cloudflare can't reach. Use the strings from Supabase → Connect → ORMs → Prisma.`);
  }
  if (/\.pooler\.supabase\.com$/.test(host)) {
    if (!/^postgres\.[a-z0-9]+$/.test(user)) {
      problems.push(`${name}: the user name should look like postgres.abcdefgh (with your project id after the dot). Copy it again from Connect → ORMs → Prisma.`);
    }
    if (port !== wantPort) {
      const msg = `${name} uses port ${port}; it should be ${wantPort}${wantPort === "6543" ? " (transaction pooler)" : " (session pooler)"}.`;
      (name === "DIRECT_URL" ? problems : warnings).push(msg);
    }
  }
  return { name, url: v, user, host, port };
}

const main = inspect("DATABASE_URL", "6543");
const direct = inspect("DIRECT_URL", "5432");

for (const c of [main, direct]) {
  if (!c) continue;
  console.log(`${c.name}: postgresql://${c.user}:••••••@${c.host}:${c.port}`);
}
if (main && direct && (main.user !== direct.user || main.host !== direct.host)) {
  problems.push("DATABASE_URL and DIRECT_URL point at different Supabase projects. Copy both from the same project.");
}
const region = (direct ?? main)?.host.match(/^aws-\d+-([a-z0-9-]+)\.pooler\.supabase\.com$/)?.[1];
if (region) console.log(`Database region: ${REGIONS[region] ?? region}`);

function explain(err) {
  const text = `${err?.code ?? ""} ${err?.message ?? err}`;
  if (/28P01|password authentication failed|authentication failed/i.test(text)) {
    return "Supabase says the password is wrong. Reset it in Supabase (Project Settings → Database → Reset database password), wait 2 minutes, make new keys with the helper page and replace BOTH secrets.";
  }
  if (/tenant or user not found/i.test(text)) {
    return "Supabase doesn't recognise the user name or project. Copy both strings again from Supabase → Connect → ORMs → Prisma.";
  }
  if (/ENOTFOUND|EAI_AGAIN/i.test(text)) return "The database address doesn't exist. Copy the strings again from Supabase.";
  if (/ETIMEDOUT|ECONNREFUSED|timeout/i.test(text)) {
    return "Couldn't reach the database. Check the Supabase project isn't paused (open it in Supabase and press Restore if asked).";
  }
  return `Couldn't connect to the database: ${err?.message ?? err}`;
}

if (problems.length === 0 && direct) {
  const u = new URL(direct.url);
  u.searchParams.delete("pgbouncer");
  u.searchParams.delete("connection_limit");
  const supabase = /supabase\.(com|co)$/.test(direct.host);
  const client = new pg.Client({ connectionString: u.toString(), connectionTimeoutMillis: 15_000, ...(supabase ? { ssl: { rejectUnauthorized: false } } : {}) });
  try {
    await client.connect();
    await client.query("select 1");
    console.log("Database connection: OK ✓");
  } catch (err) {
    problems.push(explain(err));
  } finally {
    await client.end().catch(() => {});
  }
}

for (const w of warnings) console.log(`Note: ${w}`);
if (problems.length) {
  console.error("\n✗ The database settings need fixing before the site can be built:");
  for (const p of problems) console.error(`  • ${p}`);
  console.error("");
  process.exit(1);
}
