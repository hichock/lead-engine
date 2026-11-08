import { createSign } from "node:crypto";
import { requireEnv } from "../env";
import { getJson } from "./http";

// Minimal BigQuery client for a service-account key (GCP_SA_KEY = the JSON key, raw or base64).
// Every query sets maximumBytesBilled, so BigQuery itself refuses anything over the cap.
// Slow queries return complete:false with a jobId: poll with getResults(jobId). Never re-run (a re-run bills again).

type ServiceAccount = { client_email: string; private_key: string; project_id: string };

function serviceAccount(): ServiceAccount {
  const raw = requireEnv("GCP_SA_KEY");
  const json = raw.startsWith("{") ? raw : Buffer.from(raw, "base64").toString("utf8");
  return JSON.parse(json) as ServiceAccount;
}

async function token(sa: ServiceAccount): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const enc = (o: object) => Buffer.from(JSON.stringify(o)).toString("base64url");
  const unsigned = `${enc({ alg: "RS256", typ: "JWT" })}.${enc({
    iss: sa.client_email, scope: "https://www.googleapis.com/auth/bigquery",
    aud: "https://oauth2.googleapis.com/token", iat: now, exp: now + 3600,
  })}`;
  const sig = createSign("RSA-SHA256").update(unsigned).sign(sa.private_key, "base64url");
  const d = await getJson<{ access_token: string }>("google-oauth", "https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer", assertion: `${unsigned}.${sig}` }),
  });
  return d.access_token;
}

type Raw = {
  totalBytesProcessed?: string; jobComplete?: boolean; jobReference?: { jobId?: string; location?: string };
  schema?: { fields?: { name: string }[] }; rows?: { f: { v: unknown }[] }[];
};
export type BqResult = { gb: number; complete: boolean; jobId: string | null; location: string | null; rows: Record<string, unknown>[] };

const GB = 1e9;
function toResult(d: Raw): BqResult {
  const names = (d.schema?.fields ?? []).map((f) => f.name);
  return {
    gb: Number(d.totalBytesProcessed ?? 0) / GB,
    complete: d.jobComplete !== false,
    jobId: d.jobReference?.jobId ?? null,
    location: d.jobReference?.location ?? null,
    rows: (d.rows ?? []).map((r) => Object.fromEntries(r.f.map((c, i) => [names[i], c.v]))),
  };
}

export async function query(sql: string, opts: { dryRun: boolean; maxGb: number }): Promise<BqResult> {
  const sa = serviceAccount();
  const d = await getJson<Raw>("bigquery", `https://bigquery.googleapis.com/bigquery/v2/projects/${sa.project_id}/queries`, {
    method: "POST",
    headers: { Authorization: `Bearer ${await token(sa)}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      query: sql, useLegacySql: false, dryRun: opts.dryRun, timeoutMs: 45_000, maxResults: 10_000,
      maximumBytesBilled: String(Math.round(opts.maxGb * GB)),
    }),
  });
  return toResult(d);
}

export async function getResults(jobId: string, location = "US"): Promise<BqResult> {
  const sa = serviceAccount();
  const url = `https://bigquery.googleapis.com/bigquery/v2/projects/${sa.project_id}/queries/${encodeURIComponent(jobId)}?location=${encodeURIComponent(location)}&maxResults=10000&timeoutMs=45000`;
  const d = await getJson<Raw>("bigquery", url, { headers: { Authorization: `Bearer ${await token(sa)}` } });
  return { ...toResult(d), jobId };
}
