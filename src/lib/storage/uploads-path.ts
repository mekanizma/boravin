import path from "path";

/**
 * Writable uploads root.
 * On Render set UPLOADS_DIR=/var/data/uploads (persistent disk).
 */
export function getUploadsRoot() {
  const fromEnv = process.env.UPLOADS_DIR?.trim();
  if (fromEnv) {
    return path.isAbsolute(fromEnv)
      ? path.normalize(fromEnv)
      : path.resolve(/*turbopackIgnore: true*/ process.cwd(), fromEnv);
  }
  return path.join(/*turbopackIgnore: true*/ process.cwd(), "public", "uploads");
}

/** Resolve a public `/uploads/...` key to an absolute path, or null if unsafe. */
export function resolveUploadKey(keyParts: string[]) {
  if (!keyParts.length) return null;
  if (
    keyParts.some(
      (part) =>
        !part ||
        part === "." ||
        part === ".." ||
        part.includes("\0") ||
        part.includes("/") ||
        part.includes("\\"),
    )
  ) {
    return null;
  }

  const root = path.resolve(getUploadsRoot());
  const fullPath = path.resolve(root, ...keyParts);
  const relative = path.relative(root, fullPath);
  if (!relative || relative.startsWith("..") || path.isAbsolute(relative)) {
    return null;
  }
  return fullPath;
}
