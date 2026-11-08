import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";
import { requireEnv } from "./env";

// AES-256-GCM for mailbox app passwords. MAILBOX_ENCRYPTION_KEY = 32 random bytes, base64 (openssl rand -base64 32).
// Stored format: base64(iv) . base64(tag) . base64(ciphertext)

function key(): Buffer {
  const k = Buffer.from(requireEnv("MAILBOX_ENCRYPTION_KEY"), "base64");
  if (k.length !== 32) throw new Error("MAILBOX_ENCRYPTION_KEY must be 32 bytes, base64");
  return k;
}

export function encrypt(plain: string, k: Buffer = key()): string {
  const iv = randomBytes(12);
  const c = createCipheriv("aes-256-gcm", k, iv);
  const data = Buffer.concat([c.update(plain, "utf8"), c.final()]);
  return [iv, c.getAuthTag(), data].map((b) => b.toString("base64")).join(".");
}

export function decrypt(stored: string, k: Buffer = key()): string {
  const [iv, tag, data] = stored.split(".").map((s) => Buffer.from(s, "base64"));
  if (!iv || !tag || !data) throw new Error("bad encrypted value");
  const d = createDecipheriv("aes-256-gcm", k, iv);
  d.setAuthTag(tag);
  return Buffer.concat([d.update(data), d.final()]).toString("utf8");
}
