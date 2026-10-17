/** Public origin of the site, without a trailing slash. */
export const SITE_URL = (process.env.NEXT_PUBLIC_URI ?? '').replace(/\/+$/, '');

export const SITE_NAME = 'GitRanks';

export const SITE_TITLE = 'GitRanks · GitHub Profile Analytics & Rankings';

export const SITE_DESCRIPTION =
  'Explore rankings based on stars, contributions, and followers. Dive into dynamic leaderboards to see how you rank against developers worldwide and within your own country.';

export const SITE_X_HANDLE = '@gitranks';

/** The project's own accounts: linked from the footer and listed as `sameAs` in structured data. */
export const SITE_SOCIAL_LINKS = {
  github: 'https://github.com/gitranks/gitranks-ui',
  x: 'https://x.com/gitranks',
  bluesky: 'https://bsky.app/profile/gitranks.bsky.social',
  mastodon: 'https://mastodon.social/@github_pulse',
} as const;

export function absoluteUrl(path: string): string {
  return `${SITE_URL}${path.startsWith('/') ? path : `/${path}`}`;
}
