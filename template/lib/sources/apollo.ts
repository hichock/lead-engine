import { requireEnv } from "../env";
import { getJson } from "./http";

// Apollo free people search (mixed_people/api_search): titles + keywords + size + locations, 100 per page, no credits.
// It returns no email or domain and an obfuscated surname ("Pa***r"). Next steps: guess the domain, scan the site,
// verify. Company search and people/match cost credits, so this module does not call them.

export type ApolloSearch = {
  titles: string[];
  keywords?: string;
  employeeRanges?: string[]; // e.g. ["1,10", "11,50"]
  locations?: string[]; // e.g. ["Austin, Texas, United States"]; a city widens results, regional towns come back empty
  page?: number;
};

export type ApolloPerson = { firstName: string; lastNameHint: string; title: string; company: string; city: string | null; linkedinUrl: string | null };

type Raw = { people?: Record<string, unknown>[]; pagination?: { total_entries?: number } };
const s = (v: unknown) => (typeof v === "string" ? v : "");

export async function searchPeople(q: ApolloSearch): Promise<{ people: ApolloPerson[]; total: number }> {
  const d = await getJson<Raw>("apollo", "https://api.apollo.io/api/v1/mixed_people/api_search", {
    method: "POST",
    headers: { "x-api-key": requireEnv("APOLLO_API_KEY"), "Content-Type": "application/json", "Cache-Control": "no-cache" },
    body: JSON.stringify({
      person_titles: q.titles, q_keywords: q.keywords, organization_num_employees_ranges: q.employeeRanges,
      person_locations: q.locations, page: q.page ?? 1, per_page: 100,
    }),
  });
  const people = (d.people ?? []).map((p) => {
    const org = (p.organization ?? {}) as Record<string, unknown>;
    return {
      firstName: s(p.first_name), lastNameHint: s(p.last_name_obfuscated) || s(p.last_name), title: s(p.title),
      company: s(org.name), city: s(p.city) || null, linkedinUrl: s(p.linkedin_url) || null,
    };
  });
  return { people, total: d.pagination?.total_entries ?? people.length };
}
