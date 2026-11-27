// After `next build`: the routes whose missing pages must answer a real 404 (and old names a real 308) have no
// fallback shell. Next records that in the prerender manifest as `fallback: null`; a fallback shell (a string) is sent
// with a 200 before the page runs, so notFound() and permanentRedirect() would only reach the browser in the stream.
// A Suspense boundary or loading.tsx above the page, or a dropped generateStaticParams, brings the shell back.
//
// Also: the static pages the proxy rewrites missing addresses to are prerendered as a 404 (their `.meta` says so). A
// read added to one would make it render per request, behind a shell, with a 200.
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

export const BLOCKING_ROUTES = [
  '/profile/[login]',
  // A person's Skills tab: its "no Skills page" end answers 404.
  '/profile/[login]/skills',
  '/org/[login]',
  '/insights/[id]',
  '/repos/language/[language]/[page]',
  '/repos/no-language/[page]',
  '/packages/[registry]/[by]/[page]',
  '/package/[registry]/[...name]',
  // A repository's tabs.
  '/repo/[owner]/[name]/overview',
  '/repo/[owner]/[name]/used-by',
  '/repo/[owner]/[name]/contributors',
  // A pull request's public timeline.
  '/contribute/pr/[owner]/[repo]/[number]',
  // A step of a Build project: a missing or removed step answers 404.
  '/build/[project]/[step]',
];

/** Static pages that must be prerendered with a 404 status: the proxy rewrites missing lessons, results and courses there. */
export const STATIC_404_PAGES = ['/learn/lessons/_missing', '/learn/courses/_missing'];

/** The problems with a prerender manifest's entries for `BLOCKING_ROUTES`; empty when every one has no shell. */
export function blockingRouteProblems(manifest) {
  return BLOCKING_ROUTES.flatMap((route) => {
    const entry = manifest?.dynamicRoutes?.[route];
    if (!entry) return [`${route}: not in the prerender manifest`];
    return entry.fallback === null ? [] : [`${route}: fallback is ${JSON.stringify(entry.fallback)}, not null`];
  });
}

/** The problems with `STATIC_404_PAGES`, given each page's prerendered `.meta` (null when there is none). */
export function static404Problems(metaOf) {
  return STATIC_404_PAGES.flatMap((page) => {
    const meta = metaOf(page);
    if (!meta) return [`${page}: not prerendered`];
    return meta.status === 404 ? [] : [`${page}: prerendered with status ${JSON.stringify(meta.status)}, not 404`];
  });
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const read = (relative) => JSON.parse(readFileSync(new URL(relative, import.meta.url), 'utf8'));
  const metaOf = (page) => {
    try {
      return read(`../.next/server/app${page}.meta`);
    } catch {
      return null;
    }
  };
  const problems = [...blockingRouteProblems(read('../.next/prerender-manifest.json')), ...static404Problems(metaOf)];
  for (const problem of problems) console.error(`check-blocking-routes: ${problem}`);
  console.log(
    `check-blocking-routes: ${BLOCKING_ROUTES.length} routes without a fallback shell, ${STATIC_404_PAGES.length} static 404: ${problems.length ? 'FAILED' : 'ok'}`,
  );
  if (problems.length) process.exitCode = 1;
}
