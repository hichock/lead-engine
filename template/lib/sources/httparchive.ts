// HTTP Archive on BigQuery: every site in the Chrome UX Report crawl, with the technologies Wappalyzer detected.
// Table: `httparchive.crawl.pages` (partitioned by date; one crawl per month). Free tier: 1 TB of queries a month.
// One tech export over a monthly crawl scanned ~2.9 GB in our runs (2026-11-03). Always dry-run first.

const TECH_NAME = /^[\w .+\-#/()]{1,60}$/; // Wappalyzer names like "Softr", "Bubble", "Webflow", "Memberstack"
const DATE = /^\d{4}-\d{2}-01$/; // crawls are dated the 1st of the month

const quote = (s: string) => `'${s.replace(/\\/g, "\\\\").replace(/'/g, "\\'")}'`;

function checkInputs(techs: string[], crawlDate: string) {
  if (!DATE.test(crawlDate)) throw new Error("crawlDate must be YYYY-MM-01");
  if (!techs.length || techs.some((t) => !TECH_NAME.test(t))) throw new Error("techs: 1+ Wappalyzer names (letters, digits, space . + - # / ( ))");
}

// Registrable domains running any of the techs, root and non-root pages, best (lowest) traffic rank first.
export function techDomainsSql(techs: string[], crawlDate: string, limit = 5000): string {
  checkInputs(techs, crawlDate);
  const lim = Math.max(1, Math.min(Math.floor(limit), 50_000));
  return `SELECT NET.REG_DOMAIN(root_page) AS domain, ARRAY_AGG(DISTINCT t.technology) AS techs, MIN(rank) AS rank
FROM \`httparchive.crawl.pages\`, UNNEST(technologies) AS t
WHERE date = '${crawlDate}' AND client = 'mobile' AND t.technology IN (${techs.map(quote).join(", ")})
GROUP BY domain
ORDER BY rank
LIMIT ${lim}`;
}

// Technology names with site counts in one crawl, to pick exact Wappalyzer names before the export.
export function techNamesSql(crawlDate: string, like: string): string {
  checkInputs(["x"], crawlDate);
  if (!/^[\w .+\-]{1,40}$/.test(like)) throw new Error("like: plain text");
  return `SELECT t.technology, COUNT(DISTINCT NET.REG_DOMAIN(root_page)) AS domains
FROM \`httparchive.crawl.pages\`, UNNEST(technologies) AS t
WHERE date = '${crawlDate}' AND client = 'mobile' AND is_root_page AND LOWER(t.technology) LIKE ${quote(`%${like.toLowerCase()}%`)}
GROUP BY 1 ORDER BY 2 DESC LIMIT 50`;
}

// Domains in this crawl that were not in the previous one: the monthly "new users of a tool" diff.
export function newDomainsSql(techs: string[], crawlDate: string, prevCrawlDate: string): string {
  checkInputs(techs, crawlDate);
  checkInputs(techs, prevCrawlDate);
  const pick = (d: string) => `SELECT DISTINCT NET.REG_DOMAIN(root_page) AS domain FROM \`httparchive.crawl.pages\`, UNNEST(technologies) AS t
  WHERE date = '${d}' AND client = 'mobile' AND t.technology IN (${techs.map(quote).join(", ")})`;
  return `WITH cur AS (${pick(crawlDate)}), prev AS (${pick(prevCrawlDate)})
SELECT cur.domain FROM cur LEFT JOIN prev USING (domain) WHERE prev.domain IS NULL`;
}
