import { isContributePath } from './contribute-path';

/**
 * Where a click into Contribute came from: one id per place on the site that links there. Add a place here, then mark
 * its link (or the section around its links) with `contributeSource('<id>')`:
 *
 *   <Link href="/contribute" {...contributeSource('top_bar')}>
 *
 * A link to Contribute with no mark is still counted, as `other`.
 */
export const CONTRIBUTE_SOURCES = [
  /** The announcement bar above the header. */
  'top_bar',
  /** The Contribute section of the home page. */
  'landing_block',
  /** "Contribute" in the header menu. */
  'main_menu',
  /** "Issues for you" on the signed-in user's own profile. */
  'profile_issues_block',
  /** The Contribute block a visitor sees on a profile. */
  'profile_visitor_block',
  'footer',
  /** The action buttons of Contribute's own landing: the step from reading about it to starting. */
  'contribute_landing',
  /** A link to Contribute that carries no mark. */
  'other',
] as const;

export type ContributeSource = (typeof CONTRIBUTE_SOURCES)[number];

export const CONTRIBUTE_SOURCE_ATTR = 'data-contribute-source';

/**
 * The mark, spread onto a link or button (it counts every click on it), or onto a section (it names the source of
 * every link to Contribute inside).
 */
export const contributeSource = (source: ContributeSource) => ({ [CONTRIBUTE_SOURCE_ATTR]: source }) as const;

/** Sources whose links sit on Contribute's own pages; any other click there is moving around inside it. */
const INSIDE_SOURCES: ReadonlySet<string> = new Set<ContributeSource>(['contribute_landing']);

export const CLICK_REPORT_PATH = '/api/contribute/click';

export type ClickKind = 'click' | 'landing' | 'connect';
export type ConnectWay = 'key' | 'agent';

/** How the visit began: the address's campaign tags and the other site it came from. */
export type Entry = { utmSource?: string; utmMedium?: string; utmCampaign?: string; referrerHost?: string };

export type ClickReport = Entry & { kind: ClickKind; path: string; source?: string; target?: string };

/** The link's path when it stays on this site, without query or hash. */
function pathOf(href: string | null | undefined, origin: string): string | null {
  if (!href) return null;
  try {
    const url = new URL(href, origin);
    return url.origin === origin ? url.pathname : null;
  } catch {
    return null;
  }
}

export type ClickFacts = {
  /** The mark on the clicked link or button itself. */
  own?: string | null;
  /** The mark on the nearest section around it. */
  around?: string | null;
  /** The clicked link's `href`; none for a button. */
  href?: string | null;
  /** The page the click happened on. */
  pagePath: string;
  origin: string;
};

/**
 * What a click counts as, or null when it is not a step into Contribute: a marked link or button always counts under
 * its own mark; a link to Contribute counts under the section's mark, else as `other`. On Contribute's own pages only
 * the marks made for them count.
 */
export function clickOf({
  own,
  around,
  href,
  pagePath,
  origin,
}: ClickFacts): { source: string; target?: string } | null {
  const path = pathOf(href, origin);
  const target = path && isContributePath(path) ? path : null;
  const source = own || (target ? around || 'other' : null);
  if (!source) return null;
  if (isContributePath(pagePath) && !INSIDE_SOURCES.has(source)) return null;
  return path ? { source, target: path } : { source };
}

const tagOf = (params: URLSearchParams, name: string) =>
  params.get(name)?.trim().toLowerCase().slice(0, 64) || undefined;

/**
 * Links of ours that carry no campaign tags but say where they were put: an agent sending its person to sign in
 * (`/contribute?start=agent`) and the footer of a pull request we opened (`/contribute/maintainers?from=<attempt>`).
 */
function implicitSourceOf(pathname: string, params: URLSearchParams): string | undefined {
  if (params.get('start') === 'agent') return 'mcp_agent';
  if (/^\/contribute\/maintainers\/?$/.test(pathname) && params.has('from')) return 'pr_footer';
  return undefined;
}

/**
 * The visit's entry, read once from its first page: `utm_source` (else `ref`, which Product Hunt adds to the links it
 * sends, else what the link itself says, `implicitSourceOf`), `utm_medium`, `utm_campaign` and the other site it came
 * from.
 */
export function entryOf(pathname: string, search: string, referrer: string, origin: string): Entry {
  const params = new URLSearchParams(search);
  let referrerHost: string | undefined;
  try {
    const url = referrer ? new URL(referrer) : null;
    if (url && url.origin !== origin) referrerHost = url.hostname.toLowerCase();
  } catch {
    // not an address: no referrer
  }
  const entry: Entry = {
    utmSource: tagOf(params, 'utm_source') ?? tagOf(params, 'ref') ?? implicitSourceOf(pathname, params),
    utmMedium: tagOf(params, 'utm_medium'),
    utmCampaign: tagOf(params, 'utm_campaign'),
    referrerHost,
  };
  return Object.fromEntries(Object.entries(entry).filter(([, value]) => value)) as Entry;
}

/** A visit that started on Contribute: its first page is one of Contribute's. */
export const isLanding = (pagePath: string) => isContributePath(pagePath);

/** Whether an entry names a channel: campaign tags or another site. A visit typed in or bookmarked names none. */
export const namesChannel = (entry: Entry) => Boolean(entry.utmSource || entry.utmCampaign || entry.referrerHost);

/** The first visit's entry that named a channel, kept in this browser for the connect it may lead to. */
export type FirstEntry = { entry: Entry; at: number };

/** How long a click is remembered for the connect it may lead to. */
export const LAST_CLICK_DAYS = 30;

export type LastClick = { source: string; path: string; at: number };

/** The remembered click, when it is whole and recent enough to have led to this connect. */
export function lastClickOf(stored: string | null, now: number): LastClick | null {
  if (!stored) return null;
  try {
    const value = JSON.parse(stored) as Partial<LastClick> | null;
    if (typeof value?.source !== 'string' || typeof value.path !== 'string' || typeof value.at !== 'number')
      return null;
    const age = now - value.at;
    return age >= 0 && age <= LAST_CLICK_DAYS * 24 * 60 * 60 * 1000 ? (value as LastClick) : null;
  } catch {
    return null;
  }
}

/** The first entry on record, when it is whole and recent enough (`LAST_CLICK_DAYS`) to have led to this connect. */
export function firstEntryOf(stored: string | null, now: number): Entry | null {
  if (!stored) return null;
  try {
    const value = JSON.parse(stored) as Partial<FirstEntry> | null;
    if (!value?.entry || typeof value.entry !== 'object' || typeof value.at !== 'number') return null;
    const age = now - value.at;
    if (age < 0 || age > LAST_CLICK_DAYS * 24 * 60 * 60 * 1000) return null;
    const entry = Object.fromEntries(
      Object.entries(value.entry).filter(
        ([key, field]) =>
          ['utmSource', 'utmMedium', 'utmCampaign', 'referrerHost'].includes(key) && typeof field === 'string',
      ),
    ) as Entry;
    return namesChannel(entry) ? entry : null;
  } catch {
    return null;
  }
}
