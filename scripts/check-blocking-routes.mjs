// After `next build`: the routes whose missing pages must answer a real 404 (and old names a real 308) have no
// fallback shell. Next records that in the prerender manifest as `fallback: null`; a fallback shell (a string) is sent
// with a 200 before the page runs, so notFound() and permanentRedirect() would only reach the browser in the stream.
// A Suspense boundary or loading.tsx above the page, or a dropped generateStaticParams, brings the shell back.
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

export const BLOCKING_ROUTES = [
  '/repo/[owner]/[name]',
  '/profile/[login]',
  '/org/[login]',
  '/insights/[id]',
  '/repos/language/[language]/[page]',
  '/repos/no-language/[page]',
];

/** The problems with a prerender manifest's entries for `BLOCKING_ROUTES`; empty when every one has no shell. */
export function blockingRouteProblems(manifest) {
  return BLOCKING_ROUTES.flatMap((route) => {
    const entry = manifest?.dynamicRoutes?.[route];
    if (!entry) return [`${route}: not in the prerender manifest`];
    return entry.fallback === null ? [] : [`${route}: fallback is ${JSON.stringify(entry.fallback)}, not null`];
  });
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const path = new URL('../.next/prerender-manifest.json', import.meta.url);
  const problems = blockingRouteProblems(JSON.parse(readFileSync(path, 'utf8')));
  for (const problem of problems) console.error(`check-blocking-routes: ${problem}`);
  console.log(
    `check-blocking-routes: ${BLOCKING_ROUTES.length} routes without a fallback shell: ${problems.length ? 'FAILED' : 'ok'}`,
  );
  if (problems.length) process.exitCode = 1;
}
