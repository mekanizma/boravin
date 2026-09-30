/**
 * Render start: ensure persistent uploads dir exists, then bind Next.js.
 *
 * Uploads are served by `src/app/uploads/[...path]/route.ts` from UPLOADS_DIR.
 * Do not symlink into public/uploads — Next static 404s for missing public files
 * and can block the App Router route from reading the persistent disk.
 */
import fs from "node:fs";
import path from "node:path";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const publicUploads = path.join(root, "public", "uploads");
const uploadsDir = (
  process.env.UPLOADS_DIR?.trim() || publicUploads
).replace(/[/\\]+$/, "");

fs.mkdirSync(uploadsDir, { recursive: true });

const resolvedPublic = path.resolve(publicUploads);
const resolvedDisk = path.resolve(uploadsDir);

if (resolvedPublic !== resolvedDisk) {
  // Remove stale public/uploads symlink or dir so /uploads/* hits the route handler.
  try {
    fs.lstatSync(publicUploads);
    fs.rmSync(publicUploads, { recursive: true, force: true });
    console.log(
      `[start:render] removed ${publicUploads} (serving via /uploads route)`,
    );
  } catch {
    // public/uploads absent — good
  }
}

console.log(`[start:render] uploads dir ${resolvedDisk}`);

const port = process.env.PORT || "3000";
const child = spawn(
  process.platform === "win32" ? "npx.cmd" : "npx",
  ["next", "start", "-H", "0.0.0.0", "-p", String(port)],
  {
    cwd: root,
    stdio: "inherit",
    env: process.env,
    shell: process.platform === "win32",
  },
);

child.on("exit", (code, signal) => {
  if (signal) process.kill(process.pid, signal);
  process.exit(code ?? 1);
});
