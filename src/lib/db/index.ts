import path from "path";
import fs from "fs";
import { PGlite } from "@electric-sql/pglite";
import { drizzle as drizzlePglite } from "drizzle-orm/pglite";
import { drizzle as drizzlePostgres } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

export type AppDatabase =
  | ReturnType<typeof drizzlePglite<typeof schema>>
  | ReturnType<typeof drizzlePostgres<typeof schema>>;

const globalForDb = globalThis as unknown as {
  boravinDb?: AppDatabase;
  boravinPglite?: PGlite;
  boravinSql?: ReturnType<typeof postgres>;
};

function usePglite() {
  const provider = (process.env.DATABASE_PROVIDER ?? "").toLowerCase();
  const url = process.env.DATABASE_URL ?? "";
  // Explicit postgres / Supabase always wins — never fall back to a stale PGlite.
  if (
    provider === "postgres" ||
    provider === "supabase" ||
    url.includes("supabase.co") ||
    url.includes("pooler.supabase.com") ||
    url.startsWith("postgresql://") ||
    url.startsWith("postgres://")
  ) {
    return false;
  }
  return (
    provider === "pglite" ||
    url.startsWith("pglite:") ||
    url.startsWith("file:")
  );
}

function resolveDataDir(raw: string) {
  const trimmed = raw.trim() || "./data/boravin";
  return path.isAbsolute(trimmed)
    ? path.normalize(trimmed)
    : path.resolve(process.cwd(), trimmed);
}

function pgliteDataDir() {
  const url = process.env.DATABASE_URL ?? "pglite:./data/boravin";
  let dir: string;
  if (url.startsWith("pglite:")) {
    dir = resolveDataDir(url.replace(/^pglite:/, "") || "./data/boravin");
  } else if (url.startsWith("file:")) {
    dir = resolveDataDir(url.replace(/^file:/, "") || "./data/boravin");
  } else {
    dir = resolveDataDir(process.env.PGLITE_DATA_DIR ?? "./data/boravin");
  }
  fs.mkdirSync(dir, { recursive: true });
  // Stale lock from a crashed Next/WASM process blocks every open.
  const pidFile = path.join(dir, "postmaster.pid");
  if (fs.existsSync(pidFile)) {
    try {
      fs.unlinkSync(pidFile);
    } catch {
      // Ignore — open will fail loudly if the lock cannot be cleared.
    }
  }
  return dir;
}

function createDb(): AppDatabase {
  if (usePglite()) {
    const dataDir = pgliteDataDir();
    const client = globalForDb.boravinPglite ?? new PGlite(dataDir);
    globalForDb.boravinPglite = client;
    return drizzlePglite(client, { schema });
  }

  // Drop any stale PGlite singleton if env now points at Postgres.
  globalForDb.boravinPglite = undefined;

  const connectionString =
    process.env.DATABASE_URL ??
    "postgresql://boravin:boravin@localhost:5432/boravin";

  const managedHost =
    connectionString.includes("supabase.co") ||
    connectionString.includes("pooler.supabase.com") ||
    connectionString.includes("render.com") ||
    connectionString.includes(".oregon-postgres.render.com") ||
    connectionString.includes(".frankfurt-postgres.render.com") ||
    connectionString.includes("-a.oregon-postgres.render.com") ||
    /[.-]postgres\.render\.com/.test(connectionString);

  const sslFlag = (process.env.DATABASE_SSL ?? "").toLowerCase();
  const forceSsl =
    sslFlag === "1" ||
    sslFlag === "true" ||
    sslFlag === "require" ||
    connectionString.includes("sslmode=require");
  const disableSsl =
    sslFlag === "0" || sslFlag === "false" || sslFlag === "disable";
  const useSsl = !disableSsl && (forceSsl || managedHost);

  const sql =
    globalForDb.boravinSql ??
    postgres(connectionString, {
      max: managedHost ? 5 : 10,
      idle_timeout: 20,
      prepare: false,
      ssl: useSsl ? "require" : undefined,
    });

  if (process.env.NODE_ENV !== "production") {
    globalForDb.boravinSql = sql;
  }

  return drizzlePostgres(sql, { schema });
}

export function getDb() {
  const wantPglite = usePglite();
  const hasPglite = Boolean(globalForDb.boravinPglite);
  const hasPostgres = Boolean(globalForDb.boravinSql);
  if (
    globalForDb.boravinDb &&
    ((wantPglite && hasPglite) || (!wantPglite && hasPostgres))
  ) {
    return globalForDb.boravinDb;
  }
  // Provider flipped (e.g. pglite → supabase) — rebuild.
  globalForDb.boravinDb = undefined;
  if (!wantPglite) globalForDb.boravinPglite = undefined;
  if (wantPglite) {
    globalForDb.boravinSql = undefined;
  }
  globalForDb.boravinDb = createDb();
  return globalForDb.boravinDb;
}

/** Always resolves to the current instance so callers survive recoverDb(). */
export const db: AppDatabase = new Proxy({} as AppDatabase, {
  get(_target, prop, receiver) {
    const instance = getDb() as object;
    const value = Reflect.get(instance, prop, receiver);
    return typeof value === "function"
      ? (value as (...args: unknown[]) => unknown).bind(instance)
      : value;
  },
});

let recovering: Promise<AppDatabase> | null = null;

/** Reopen the embedded database after a WASM abort. */
export function recoverDb() {
  if (!usePglite()) return Promise.resolve(getDb());
  if (!recovering) {
    recovering = (async () => {
      const previous = globalForDb.boravinPglite;
      globalForDb.boravinPglite = undefined;
      globalForDb.boravinDb = undefined;
      if (previous) {
        try {
          await previous.close();
        } catch {
          // The aborted instance cannot close cleanly.
        }
      }
      const next = createDb();
      globalForDb.boravinDb = next;
      return next;
    })().finally(() => {
      recovering = null;
    });
  }
  return recovering;
}

export function isTransientDbError(error: unknown) {
  const texts: string[] = [];
  let current: unknown = error;
  while (current && texts.length < 4) {
    if (current instanceof Error) {
      texts.push(current.message);
      current = current.cause;
    } else {
      texts.push(String(current));
      break;
    }
  }
  const text = texts.join(" ");
  return text.includes("Aborted") || text.includes("RuntimeError");
}

/** Run a DB callback; on PGlite WASM abort, reopen and retry once. */
export async function withDb<T>(fn: (database: AppDatabase) => Promise<T>) {
  try {
    return await fn(getDb());
  } catch (error) {
    if (!isTransientDbError(error)) throw error;
    await recoverDb();
    return await fn(getDb());
  }
}

export function isPglite() {
  return usePglite();
}

export function getPgliteClient() {
  if (!usePglite()) return null;
  return globalForDb.boravinPglite ?? null;
}

/** Flush and release the embedded database. Required before process.exit. */
export async function closeDb() {
  const pglite = globalForDb.boravinPglite;
  const sqlClient = globalForDb.boravinSql;
  globalForDb.boravinPglite = undefined;
  globalForDb.boravinSql = undefined;
  globalForDb.boravinDb = undefined;
  if (pglite) await pglite.close();
  if (sqlClient) await sqlClient.end({ timeout: 5 });
}
