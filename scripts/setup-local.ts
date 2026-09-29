import { config } from "dotenv";
config({ path: ".env.local" });
config();
import { spawn } from "child_process";
import path from "path";

process.env.DATABASE_PROVIDER = process.env.DATABASE_PROVIDER || "pglite";
process.env.DATABASE_URL =
  process.env.DATABASE_URL?.startsWith("pglite:") ||
  process.env.DATABASE_URL?.startsWith("file:")
    ? process.env.DATABASE_URL
    : process.env.LOCALAPPDATA
      ? `pglite:${process.env.LOCALAPPDATA.replace(/\\/g, "/")}/boravin/pglite`
      : "pglite:./data/boravin";

function run(command: string, args: string[]) {
  return new Promise<void>((resolve, reject) => {
    const child = spawn(command, args, {
      stdio: "inherit",
      shell: true,
      env: process.env,
      cwd: process.cwd(),
    });
    child.on("exit", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`${command} ${args.join(" ")} failed (${code})`));
    });
  });
}

async function main() {
  console.log("BORAVIN local setup (no Docker) — PGlite\n");
  await run("npx", ["tsx", path.join("scripts", "db-migrate-pglite.ts")]);
  await run("npx", ["tsx", path.join("scripts", "seed.ts")]);
  console.log("\nHazır. Şimdi: npm run dev");
  console.log("Admin: admin@boravin.com / Admin123!");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
