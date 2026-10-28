/** Public origin of the site, without a trailing slash. */
export const SITE_URL = (process.env.NEXT_PUBLIC_URI ?? '').replace(/\/+$/, '');

export const SITE_NAME = 'GitRanks';

export const SITE_TITLE = 'GitRanks · GitHub Rankings, Analytics & README Badges';

/** What GitRanks is, in one line: the site's meta description, its JSON-LD and anything else that states it. */
export const SITE_DESCRIPTION =
  'GitHub rankings, analytics and README badges for developers, repositories and organizations.';

export const SITE_X_HANDLE = '@gitranks';

/** The project's own accounts, linked from the footer. */
export const SITE_SOCIAL_LINKS = {
  github: 'https://github.com/gitranks/gitranks-ui',
  x: 'https://x.com/gitranks',
  bluesky: 'https://bsky.app/profile/gitranks.bsky.social',
  mastodon: 'https://mastodon.social/@github_pulse',
} as const;

/** Profiles that identify the project itself, for `sameAs`: the GitHub organization, not the repository. */
export const SITE_SAME_AS = [
  'https://github.com/gitranks',
  SITE_SOCIAL_LINKS.x,
  SITE_SOCIAL_LINKS.bluesky,
  SITE_SOCIAL_LINKS.mastodon,
];

export function absoluteUrl(path: string): string {
  return `${SITE_URL}${path.startsWith('/') ? path : `/${path}`}`;
}
