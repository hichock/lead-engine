"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { context } from "@/lib/data/load";
import { isDemo } from "@/lib/env";
import { queueLeads } from "@/lib/pipeline/queue";

// Approve drafts: the send checks run, passing leads move to the queue, refusals are shown with their reason.
export async function approveDrafts(fd: FormData) {
  if (isDemo()) redirect("/outreach?error=Demo mode: nothing is queued");
  const ids = fd.getAll("person").map(String).filter(Boolean).slice(0, 200);
  if (!ids.length) redirect("/outreach?error=Pick at least one draft");
  const c = await context();
  if ("mode" in c) redirect("/outreach?error=Sign in as a team member first");
  let msg: string;
  try {
    const r = await queueLeads(c.db, ids);
    const refused = r.refused.map((x) => x.reason).join("; ");
    msg = `saved=${r.queued}${refused ? `&error=${encodeURIComponent(`Not queued: ${refused}`)}` : ""}`;
  } catch (e) {
    msg = `error=${encodeURIComponent((e as Error).message)}`;
  }
  revalidatePath("/outreach");
  redirect(`/outreach?${msg}`);
}
