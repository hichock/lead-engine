import { requireEnv } from "../env";
import { getJson } from "./http";

// Apify actors: start a run with a hard spend ceiling, then poll. Never start the same input twice: the ledger
// stores the run id and resumes it. Actor ids use "user~name" in the API ("harvestapi/linkedin-post-comments" works too).

export type ApifyRun = { id: string; status: string; datasetId: string | null; usageUsd: number | null };
type Raw = { data?: { id?: string; status?: string; defaultDatasetId?: string; usageTotalUsd?: number } };

const base = "https://api.apify.com/v2";
const auth = () => ({ Authorization: `Bearer ${requireEnv("APIFY_TOKEN")}` });
const toRun = (d: Raw): ApifyRun => ({
  id: d.data?.id ?? "", status: d.data?.status ?? "UNKNOWN", datasetId: d.data?.defaultDatasetId ?? null, usageUsd: d.data?.usageTotalUsd ?? null,
});

export const actorPath = (actor: string) => {
  if (!/^[\w.-]+[/~][\w.-]+$/.test(actor)) throw new Error("actor: user/name or user~name");
  return actor.replace("/", "~");
};

// maxUsd is passed as maxTotalChargeUsd, so Apify stops a pay-per-result actor at that spend.
export async function startRun(actor: string, input: unknown, maxUsd: number): Promise<ApifyRun> {
  const qs = new URLSearchParams({ maxTotalChargeUsd: maxUsd.toFixed(2) });
  return toRun(await getJson<Raw>("apify", `${base}/acts/${actorPath(actor)}/runs?${qs}`, {
    method: "POST", headers: { ...auth(), "Content-Type": "application/json" }, body: JSON.stringify(input ?? {}),
  }));
}

export async function getRun(runId: string): Promise<ApifyRun> {
  if (!/^\w+$/.test(runId)) throw new Error("runId: letters and digits");
  return toRun(await getJson<Raw>("apify", `${base}/actor-runs/${runId}`, { headers: auth() }));
}

export async function items(datasetId: string, limit = 1000): Promise<unknown[]> {
  if (!/^\w+$/.test(datasetId)) throw new Error("datasetId: letters and digits");
  return getJson<unknown[]>("apify", `${base}/datasets/${datasetId}/items?clean=true&limit=${Math.min(limit, 1000)}`, { headers: auth() });
}

export const finished = (status: string) => ["SUCCEEDED", "FAILED", "ABORTED", "TIMED-OUT"].includes(status);
