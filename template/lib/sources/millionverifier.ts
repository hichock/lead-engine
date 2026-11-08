import { requireEnv } from "../env";
import { getJson } from "./http";

// MillionVerifier single-email API. Only "ok" is sendable. catch_all and unknown go to a retry list
// (unknown can be retried later or through Monid Hunter). ~$0.0037 per check on one-time packs.

export type MvResult = "ok" | "catch_all" | "unknown" | "invalid" | "disposable" | "error";
export const MV_USD_PER_CHECK = 0.0037;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function verifyOne(email: string): Promise<{ email: string; result: MvResult }> {
  if (!EMAIL.test(email)) return { email, result: "invalid" };
  const qs = new URLSearchParams({ api: requireEnv("MILLIONVERIFIER_API_KEY"), email, timeout: "20" });
  const d = await getJson<{ result?: string }>("millionverifier", `https://api.millionverifier.com/api/v3/?${qs}`);
  const r = (d.result ?? "error") as MvResult;
  return { email, result: ["ok", "catch_all", "unknown", "invalid", "disposable"].includes(r) ? r : "error" };
}

// 1–25 at a time, in sequence (gentle on the API, easy to stop at a cap).
export async function verifyMany(emails: string[]): Promise<{ email: string; result: MvResult }[]> {
  if (emails.length < 1 || emails.length > 25) throw new Error("emails: 1–25 per call");
  const out = [];
  for (const e of emails) out.push(await verifyOne(e.trim().toLowerCase()));
  return out;
}
