import Link from "next/link";
import type { ReactNode } from "react";
import { isDemo } from "@/lib/env";

const NAV = [
  { key: "leads", href: "/", label: "Leads" },
  { key: "sources", href: "/sources", label: "Sources & runs" },
  { key: "outreach", href: "/outreach", label: "Outreach" },
  { key: "settings", href: "/settings", label: "Settings" },
] as const;

export type NavKey = (typeof NAV)[number]["key"];

function Mark() {
  // Three rising signal bars: discover → qualify → contact.
  return (
    <svg className="brand-mark" viewBox="0 0 22 22" aria-hidden="true">
      <rect x="1" y="12" width="5" height="9" rx="1.5" fill="var(--line-strong)" />
      <rect x="8.5" y="7" width="5" height="14" rx="1.5" fill="var(--accent)" opacity="0.6" />
      <rect x="16" y="1" width="5" height="20" rx="1.5" fill="var(--accent)" />
    </svg>
  );
}

export function Shell({ active, children, counts }: { active: NavKey; children: ReactNode; counts?: Partial<Record<NavKey, number>> }) {
  return (
    <div className="shell">
      <aside className="rail">
        <div className="rail-inner">
        <Link href="/" className="brand" aria-label="Lead Engine home">
          <Mark />
          <span className="brand-name">Lead Engine</span>
        </Link>
        <nav className="nav" aria-label="Main">
          {NAV.map((n) => (
            <Link key={n.key} href={n.href} aria-current={n.key === active ? "page" : undefined}>
              {n.label}
              {counts?.[n.key] != null ? <span className="count">{counts[n.key]}</span> : null}
            </Link>
          ))}
        </nav>
        <div className="rail-foot">
          <span>Free and open source (MIT).</span>
          <span>
            Need it on your data and CRM? <a href="https://lowcoding.dev" target="_blank" rel="noreferrer">lowcoding.dev</a>
          </span>
        </div>
        </div>
      </aside>
      <main className="main">
        <div className="page">
          {isDemo() ? (
            <p className="banner"><strong>Demo data.</strong> Every company and person here is made up. Nothing is saved or sent.</p>
          ) : null}
          {children}
        </div>
      </main>
    </div>
  );
}
