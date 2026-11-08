import { requireEnv } from "../env";
import { getJson } from "./http";

// Monid: one key, pay per call, ~90 providers (Hunter, ContactOut, verifiers...). Paths we use:
// discover (find an endpoint), inspect (its price and input), run (call it), runs/<id> (poll), wallet/balance.
// Prices seen in our runs (2026-11-03/04): Hunter email-verifier $0.012, Hunter domain-search $0.0245 per result,
// ContactOut work email $0.10 when found. The caller states maxUsd for each run; the guard checks it against the cap.

const PATH = /^(discover|inspect|run|runs\/[\w-]+|wallet\/balance)$/;

export async function call(path: string, body?: unknown): Promise<unknown> {
  if (!PATH.test(path)) throw new Error("path: discover | inspect | run | runs/<id> | wallet/balance");
  const get = path.startsWith("runs/") || path.startsWith("wallet");
  return getJson("monid", `https://api.monid.ai/v1/${path}`, {
    method: get ? "GET" : "POST",
    headers: { Authorization: `Bearer ${requireEnv("MONID_API_KEY")}`, "Content-Type": "application/json" },
    ...(get ? {} : { body: JSON.stringify(body ?? {}) }),
  });
}

// Only "run" spends money; the rest are free lookups.
export const isPaidPath = (path: string) => path === "run";
