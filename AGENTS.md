<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# This repository is public

Commit messages, PR titles and bodies, code comments and issue comments here are world-readable and
effectively permanent. Force-pushing does **not** reliably remove a pushed commit — the old object
stays reachable by SHA. Getting it right before posting is the only real control.

Never write any of these into them:

- the name or existence of another repository, or a cross-repo issue/PR reference (`owner/repo#123`)
- other systems' internals: service or app names, queues, schedulers, background jobs, data stores
- hostnames, IPs, ports, or anything describing how to reach a backend
- deployment and edge details: CI/CD steps, CDN/WAF/firewall rules, or which protection they skip
- env var *values*, or secret names paired with what they unlock

Describe the change in this repo, on its own terms. When work here depends on something outside it,
write "handled outside this repo" and stop — do not name it, link it, or characterise it. If the
detail needs recording, ask where the private notes belong rather than putting it here.

This applies to anything you generate, including text you are merely summarising or carrying over
from another context.

