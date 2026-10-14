import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

const PREFIX = "meu:v1:";
function key(): Buffer {
  const value = process.env.ENCRYPTION_KEY;
  if (!value || !/^[a-fA-F0-9]{64}$/.test(value)) {
    throw new Error("ENCRYPTION_KEY must be a 64-character hex key shared by frontend and scheduler");
  }
  return Buffer.from(value, "hex");
}
export function encryptSecret(value: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key(), iv);
  const encrypted = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  return PREFIX + [iv, cipher.getAuthTag(), encrypted].map(b => b.toString("base64url")).join(":");
}
export function decryptSecret(value: string): string {
  // Legacy records remain readable until the explicit encryption migration is run.
  if (!value.startsWith(PREFIX)) {
    if (value.startsWith("meu:")) throw new Error("Unsupported secret format");
    return value;
  }
  const parts = value.slice(PREFIX.length).split(":");
  if (parts.length !== 3) throw new Error("Invalid encrypted secret");
  const [iv, tag, data] = parts.map(p => Buffer.from(p, "base64url"));
  if (!iv || iv.length !== 12 || !tag || tag.length !== 16 || !data) throw new Error("Invalid encrypted secret");
  const decipher = createDecipheriv("aes-256-gcm", key(), iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(data), decipher.final()]).toString("utf8");
}
