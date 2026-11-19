import { WORKSPACE_PATHS } from './paths';

/**
 * What the address by attempt answers when it has nowhere to send the browser: a route handler renders no page, so its
 * 404 and its 503 are this small page of their own, with the way back to the Pull requests tab. Never kept by a cache:
 * the address answers per viewer. It names nothing of the attempt.
 */
const COPY = {
  404: {
    title: "This page isn't here",
    text: 'No pull request of yours is at this address. It may belong to another GitHub account.',
  },
  503: { title: "This page didn't load", text: 'Reload to try again.' },
} as const;

export const BY_ATTEMPT_HEADERS = {
  'Cache-Control': 'private, no-store',
  'Content-Type': 'text/html; charset=utf-8',
} as const;

/** The page for a status: its title, one sentence, and "← Pull requests". Fixed text alone, so nothing needs escaping. */
export function byAttemptPageOf(status: 404 | 503): string {
  const { title, text } = COPY[status];
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex">
<title>${title} · GitRanks</title>
<style>
:root{color-scheme:light dark;--bg:#fff;--fg:#0a0a0a;--muted:#6b6b76;--link:#7c3aed}
@media (prefers-color-scheme:dark){:root{--bg:#0a0a0a;--fg:#f5f5f5;--muted:#a1a1aa;--link:#a78bfa}}
body{margin:0;background:var(--bg);color:var(--fg);font:16px/1.5 system-ui,-apple-system,"Segoe UI",sans-serif}
main{max-width:40rem;margin:0 auto;padding:3rem 1rem;display:flex;flex-direction:column;align-items:flex-start;gap:.75rem}
a{color:var(--link);font-weight:600;font-size:.875rem;text-decoration:none}
h1{margin:0;font-size:1.875rem;line-height:1.2}
p{margin:0;color:var(--muted)}
</style>
</head>
<body>
<main data-review="${status === 404 ? 'not-found' : 'unavailable'}">
<a href="${WORKSPACE_PATHS.pullRequests}">← Pull requests</a>
<h1>${title}</h1>
<p>${text}</p>
</main>
</body>
</html>
`;
}
