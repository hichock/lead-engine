# Knowledge base map

Read `RULES.md` first. Status: `filled` (has real answers), `draft` (auto-drafted, owner to check), `needs input`,
`living` (grows every run). Update this map when a file's status changes.

| File | What it holds | Status |
|---|---|---|
| [RULES.md](RULES.md) | How to read and write this knowledge base | filled |
| [setup-state.md](setup-state.md) | Setup checklist; open `[ ]` items mean setup is not finished | living |
| [plan.md](plan.md) | The approved plan: channels, services and cost, timeline, mode (page: `docs/plan.html`) | not started |
| [context.md](context.md) | The business: who, what, tools, people, links, mode, support contact | needs input |
| [offer.md](offer.md) | What we sell, price anchor, proof lines, free sample, booking link, who answers replies | needs input |
| [icp.md](icp.md) | Who buys: gates, score weights, exclusions, target tools | needs input |
| [voice.md](voice.md) | How emails sound: examples, banned words, signature, word limit | needs input |
| [sources.md](sources.md) | One row per source: access, cost, cap per run, last run, yield; sending setup | living |
| [decisions.md](decisions.md) | Decisions and standing rules, newest first | living |
| [findings.md](findings.md) | Things that broke or surprised us | living |
| [tools.md](tools.md) | Every tool: what for, sign-up link, free tier, price, known discounts (the only place for links) | filled |
| [playbook.md](playbook.md) | Index of the outreach best practices and where each rule lives | filled |
| [dev-rules.md](dev-rules.md) | Code rules for changing the app | filled |
| [research/README.md](research/README.md) | Index of research notes | living |
| `runs/` | One short note per skill run (`<date>-<skill>.md`) | living |

Built-in research that came with the bundle lives next to the skills that use it:
`.claude/skills/<skill>/references/*.md` (tech search, Apify actors, Monid, Zapmail, MillionVerifier, Apollo,
viral-post comments, comments research, failed signals, copy rules, stop-loss, non-obvious and partner channels).
Each fact keeps its label and date. [playbook.md](playbook.md) indexes them.
