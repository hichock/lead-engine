// Display helpers shared by view models. Pure.
export type Tone = "good" | "warn" | "bad" | "info" | "neutral";

export function ago(iso: string | null, now: Date): string {
  if (!iso) return "–";
  const mins = Math.round((now.getTime() - new Date(iso).getTime()) / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} min ago`;
  const h = Math.round(mins / 60);
  if (h < 24) return `${h} h ago`;
  return `${Math.round(h / 24)} d ago`;
}

export const usd = (n: number) => (n === 0 ? "$0" : `$${n.toFixed(2)}`);
export const pct = (part: number, whole: number) => (whole > 0 ? `${Math.round((part / whole) * 100)}%` : "–");

export function scoreTone(score: number | null): Tone {
  if (score == null) return "neutral";
  if (score >= 60) return "good";
  if (score >= 35) return "info";
  return "neutral";
}

export const STATUS_TONE: Record<string, Tone> = {
  new: "neutral", qualified: "info", rejected: "bad", contacted: "warn", replied: "good", won: "good", lost: "neutral",
  ok: "good", catch_all: "warn", unknown: "warn", invalid: "bad", disposable: "bad", unverified: "neutral",
  draft: "neutral", queued: "info", sent: "good", stopped: "warn", failed: "bad", refused: "warn", pending: "info", received: "info",
  positive: "good", question: "info", objection: "warn", not_now: "neutral", unsubscribe: "bad", hostile: "bad", bounce: "bad", auto_reply: "neutral", reply: "info",
};
export const toneOf = (status: string): Tone => STATUS_TONE[status] ?? "neutral";
