import { requireEnv } from "../env";

// Reverse IP via HackerTarget: hosts on one IP (e.g. a no-code tool's custom-domain IP). Free tier returns up to
// 499 rows; whether the paid tier covers more for reverse IP is unverified. Optional source.
export async function hostsOnIp(ip: string): Promise<string[]> {
  if (!/^\d{1,3}(\.\d{1,3}){3}$/.test(ip)) throw new Error("ip: IPv4 address");
  const r = await fetch(`https://api.hackertarget.com/reverseiplookup/?q=${ip}&apikey=${encodeURIComponent(requireEnv("HACKERTARGET_API_KEY"))}`, { signal: AbortSignal.timeout(30_000) });
  const text = await r.text();
  if (!r.ok || /^error/i.test(text)) throw new Error(`hackertarget: ${text.slice(0, 200)}`);
  return text.split("\n").map((x) => x.trim().toLowerCase()).filter(Boolean);
}
