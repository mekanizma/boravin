import { config } from "dotenv";
config({ path: ".env.local" });
import postgres from "postgres";

/** Known-stable Unsplash tech photos used as replacements. */
const FALLBACKS = [
  "https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?auto=format&fit=crop&w=800&h=1000&q=80",
  "https://images.unsplash.com/photo-1517336714731-489689fd1ca8?auto=format&fit=crop&w=800&h=1000&q=80",
  "https://images.unsplash.com/photo-1496181133206-80ce9b88a853?auto=format&fit=crop&w=800&h=1000&q=80",
  "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=800&h=1000&q=80",
  "https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&w=800&h=1000&q=80",
  "https://images.unsplash.com/photo-1606144042614-b2417e99c4e3?auto=format&fit=crop&w=800&h=1000&q=80",
  "https://images.unsplash.com/photo-1593640408182-31c70c8268f5?auto=format&fit=crop&w=800&h=1000&q=80",
  "https://images.unsplash.com/photo-1610945415295-d9bbf067e59c?auto=format&fit=crop&w=800&h=1000&q=80",
  "https://images.unsplash.com/photo-1468495244123-6c6c332eeece?auto=format&fit=crop&w=800&h=1000&q=80",
  "https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=800&h=1000&q=80",
];

const KNOWN_BAD = new Set([
  "https://images.unsplash.com/photo-1574375929452-d0d077649290?auto=format&fit=crop&w=800&h=1000&q=80",
  "https://images.unsplash.com/photo-1510557882401-a2ad210afa42?auto=format&fit=crop&w=800&h=1000&q=80",
  "https://images.unsplash.com/photo-1525547719571-a2d4ac8828bb?auto=format&fit=crop&w=800&h=1000&q=80",
  "https://images.unsplash.com/photo-1541807084-5c53f6a1afeb?auto=format&fit=crop&w=800&h=1000&q=80",
  "https://images.unsplash.com/photo-1531297481264-d3c98541d1ef?auto=format&fit=crop&w=800&h=1000&q=80",
]);

async function isReachable(url) {
  if (url.startsWith("/uploads/") || url.startsWith("uploads/")) return false;
  if (KNOWN_BAD.has(url)) return false;
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 6000);
    const res = await fetch(url, {
      method: "HEAD",
      redirect: "follow",
      signal: controller.signal,
    });
    clearTimeout(timer);
    return res.ok;
  } catch {
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 8000);
      const res = await fetch(url, {
        method: "GET",
        headers: { Range: "bytes=0-0" },
        redirect: "follow",
        signal: controller.signal,
      });
      clearTimeout(timer);
      return res.ok || res.status === 206;
    } catch {
      return false;
    }
  }
}

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL missing");
  process.exit(1);
}

const sql = postgres(url, { max: 1, prepare: false, ssl: "require" });

const rows = await sql`select id, url from product_images`;
console.log(`Checking ${rows.length} images…`);

const cache = new Map();
let fixed = 0;
let i = 0;

for (const row of rows) {
  i += 1;
  let ok = cache.get(row.url);
  if (ok === undefined) {
    ok = await isReachable(row.url);
    cache.set(row.url, ok);
    process.stdout.write(
      `[${i}/${rows.length}] ${ok ? "OK " : "BAD"} ${row.url.slice(0, 90)}\n`,
    );
  }
  if (ok) continue;

  const replacement = FALLBACKS[fixed % FALLBACKS.length];
  await sql`update product_images set url = ${replacement} where id = ${row.id}`;
  fixed += 1;
}

console.log(`Done. Replaced ${fixed} broken image URL(s).`);
await sql.end({ timeout: 5 });
