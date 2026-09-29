/**
 * Render start: ensure persistent uploads dir is reachable from public/uploads,
 * then bind Next.js to 0.0.0.0:$PORT.
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
fs.mkdirSync(path.dirname(publicUploads), { recursive: true });

const resolvedPublic = path.resolve(publicUploads);
const resolvedDisk = path.resolve(uploadsDir);

if (resolvedPublic !== resolvedDisk) {
  try {
    if (fs.existsSync(publicUploads)) {
      fs.rmSync(publicUploads, { recursive: true, force: true });
    }
  } catch {
    // ignore — symlink will fail loudly if needed
  }
  fs.symlinkSync(resolvedDisk, publicUploads, "dir");
  console.log(`[start:render] linked ${publicUploads} -> ${resolvedDisk}`);
} else {
  console.log(`[start:render] uploads at ${resolvedDisk}`);
}

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
