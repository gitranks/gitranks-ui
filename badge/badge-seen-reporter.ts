import { after } from 'next/server';

import type { BadgeSeenKind } from './badge-seen';

/** Tells the API, after the response, that GitHub's image proxy fetched a badge of the entity with this name. */
export type BadgeSeenReporter = (kind: BadgeSeenKind, name: string) => void;

/** GitHub's image proxy, which fetches the images of READMEs on github.com, names itself `github-camo (…)`. */
const README_PROXY = /^github-camo/i;

/** True for GitHub's image proxy; browsers, the site's own pages among them, never match. */
export function isReadmeProxy(userAgent: string | null | undefined): boolean {
  return !!userAgent && README_PROXY.test(userAgent);
}

/**
 * For an image route: a reporter that runs after the response, never in its way, when the request is GitHub's image
 * proxy's; `undefined` for anyone else, so nothing is reported. It never throws, and the reporter, which is
 * server-only, is loaded only when it runs.
 */
export function badgeSeenReporterFor(request: Request): BadgeSeenReporter | undefined {
  if (!isReadmeProxy(request.headers.get('user-agent'))) {
    return undefined;
  }

  return (kind, name) => {
    try {
      after(async () => {
        try {
          const { reportBadgeSeen } = await import('./badge-seen');
          await reportBadgeSeen(kind, name);
        } catch {
          // Ignored: the next hit reports again.
        }
      });
    } catch (error) {
      // The image matters more than the report: the next hit asks again.
      console.error('Error reporting a badge:', error);
    }
  };
}
