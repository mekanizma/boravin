import { createHash, randomBytes } from "node:crypto";

/** Swisscows client rot13: shift letters and flip case (matches their web app). */
export function swisscowsRot(input: string, shift = 13): string {
  const alphabet = "abcdefghijklmnopqrstuvwxyz";
  let out = "";
  for (const ch of input) {
    const idx = alphabet.indexOf(ch.toLowerCase());
    if (idx === -1) {
      out += ch;
      continue;
    }
    let next = idx + shift;
    while (next >= alphabet.length) next -= alphabet.length;
    out += ch === ch.toUpperCase() ? alphabet[next] : alphabet[next].toUpperCase();
  }
  return out;
}

function swisscowsNonce(length = 32): string {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~";
  const bytes = randomBytes(length);
  let out = "";
  for (let i = 0; i < length; i++) out += alphabet[bytes[i]! % alphabet.length]!;
  return out;
}

export function swisscowsSignRequest(
  params: Record<string, string | number | boolean>,
  path: string,
  nonce = swisscowsNonce(32),
): { nonce: string; signature: string } {
  const normalized =
    "?" +
    Object.entries(params)
      .map(([key, value]) => [key, String(value)] as const)
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([key, value]) => `${key}=${value}`)
      .join("&");
  const signature = createHash("sha256")
    .update([path, normalized, swisscowsRot(nonce)].join(""))
    .digest("base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
  return { nonce, signature };
}

export function decodeSwisscowsJwtPayload(token: string): {
  items?: Array<{
    type?: string;
    name?: string;
    description?: string;
    url?: string;
    thumbnail?: { url?: string };
  }>;
} | null {
  const part = token.split(".")[1];
  if (!part) return null;
  try {
    const padded = part + "=".repeat((4 - (part.length % 4)) % 4);
    return JSON.parse(
      Buffer.from(padded.replace(/-/g, "+").replace(/_/g, "/"), "base64").toString("utf8"),
    ) as {
      items?: Array<{
        type?: string;
        name?: string;
        description?: string;
        url?: string;
        thumbnail?: { url?: string };
      }>;
    };
  } catch {
    return null;
  }
}
