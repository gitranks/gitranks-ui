import { findBadge } from './catalogue';
import { type EntityFacts, PACKAGE_NOT_READ, type PackageNotRead, packageBadgeName } from './facts';
import { type BadgeEntityPath, badgeNamePath } from './links';
import { BadgeParamsError, resolveParams } from './params';
import { renderBadge } from './render';
import type { EntityKind, ImageFormat } from './types';
import { parseDecodedPackageParams } from '@/app/package/[registry]/[...name]/utils/package-params';
import { isGithubLogin } from '@/utils/profile-refresh';
import { parseRepoParams } from '@/utils/repo-paths';

/**
 * Cache rules of the v3 badge URLs (spec §5.3, §5.4). A long-kept answer tells browsers and image proxies to keep it
 * for minutes in `Cache-Control`, and the edge to keep it for a day in the edge's own header.
 */
export const BADGE_CACHE_HEADERS = {
  /** Badge data moves at most daily: long at the edge, short in the browser; the last good image outlives an outage. */
  badge: {
    'Cache-Control': 'public, max-age=300',
    'Cloudflare-CDN-Cache-Control': 'max-age=86400, stale-while-revalidate=604800, stale-if-error=604800',
  },
  /**
   * "not yet" and star history being prepared, which a fetch of the entity can turn into the real image: kept for
   * minutes, so the image shows up soon after the fetch.
   */
  provisional: { 'Cache-Control': 'public, max-age=60, s-maxage=300' },
  /** Misses are cached too, so a made-up name costs no data read or drawing at every request. */
  notFound: { 'Cache-Control': 'public, max-age=300', 'Cloudflare-CDN-Cache-Control': 'max-age=86400' },
  badRequest: { 'Cache-Control': 'public, max-age=300', 'Cloudflare-CDN-Cache-Control': 'max-age=86400' },
  /** A failed read or drawing: the edge keeps serving its last good copy meanwhile. */
  unavailable: { 'Cache-Control': 'public, max-age=60, s-maxage=60' },
} as const satisfies Record<string, Record<string, string>>;

/** `{badge}.svg` or `{badge}.png`. */
export function parseBadgeFile(file: string): { id: string; format: ImageFormat } | null {
  const match = /^(?<id>[a-z0-9-]{1,40})\.(?<format>svg|png)$/.exec(file);
  return match?.groups ? { id: match.groups.id, format: match.groups.format as ImageFormat } : null;
}

const decode = (value: string) => {
  try {
    return decodeURIComponent(value);
  } catch {
    return null;
  }
};

const text = (body: string, status: number, cacheHeaders: Record<string, string>) =>
  new Response(body, {
    status,
    headers: { 'Content-Type': 'text/plain; charset=utf-8', ...cacheHeaders },
  });

const notFound = () => text('Badge not found', 404, BADGE_CACHE_HEADERS.notFound);

/**
 * The entity a badge URL names, as the request spells it. A package's `canonical` says whether the path spelled its
 * name as its badges do (`@scope`, not `%40scope`).
 */
export type BadgeEntityRef =
  | { kind: 'user' | 'org'; login: string }
  | { kind: 'repo'; owner: string; name: string }
  | { kind: 'package'; registry: 'npm'; name: string; canonical: boolean };

/** The entity's stored name in a badge path's terms. */
function badgePathOf(entity: EntityFacts): BadgeEntityPath {
  switch (entity.kind) {
    case 'repo':
      return { kind: 'repo', nameWithOwner: entity.nameWithOwner };
    case 'package':
      return { kind: 'package', registry: entity.registry, name: entity.name };
    default:
      return { kind: entity.kind, login: entity.login };
  }
}

/** How the entity is spelled in a URL path, from its stored name. */
function pathOf(kind: EntityKind, entity: EntityFacts): string {
  return `/badge/${kind}/${badgeNamePath(badgePathOf(entity))}`;
}

/** The name the API is told and a badge is reported by: a login, `owner/name`, or `npm/<name>`. */
function storedNameOf(entity: EntityFacts) {
  switch (entity.kind) {
    case 'repo':
      return entity.nameWithOwner;
    case 'package':
      return packageBadgeName(entity);
    default:
      return entity.login;
  }
}

function requestedName(ref: BadgeEntityRef) {
  switch (ref.kind) {
    case 'repo':
      return `${ref.owner}/${ref.name}`;
    case 'package':
      return packageBadgeName(ref);
    default:
      return ref.login;
  }
}

export type BadgeLoaders = {
  user: (login: string) => Promise<EntityFacts | null>;
  org: (login: string) => Promise<EntityFacts | null>;
  repo: (owner: string, name: string) => Promise<EntityFacts | null>;
  /**
   * An npm package by its exact name; "not read yet" for one held and not read, which has no badges until its first
   * read. Left out, a package is never found.
   */
  package?: (name: string) => Promise<EntityFacts | PackageNotRead | null>;
  /**
   * Told the repository's GitHub id once a Contribute badge is drawn. It must not delay or throw: the caller schedules
   * the work after the response. Left out, nothing is reported.
   */
  onContributeSeen?: (repoId: string) => void;
  /**
   * Told the stored name once an image of a developer or a repository is drawn: never for an organization, the
   * Contribute badge (it shows none of the repository's numbers), a redirect or an error answer. It must not delay or
   * throw: the caller schedules the work after the response. Left out, nothing is reported.
   */
  onImageServed?: (kind: 'user' | 'repo' | 'package', name: string) => void;
};

/** The entity a ref names, by its kind's loader. */
function loadEntity(ref: BadgeEntityRef, loaders: BadgeLoaders): Promise<EntityFacts | PackageNotRead | null> {
  switch (ref.kind) {
    case 'repo':
      return loaders.repo(ref.owner, ref.name);
    case 'package':
      return loaders.package ? loaders.package(ref.name) : Promise.resolve(null);
    default:
      return loaders[ref.kind](ref.login);
  }
}

/** The entity a route's params name, decoded and checked; `null` when they cannot name one. */
export function parseEntityRef(
  kind: Exclude<EntityKind, 'package'>,
  params: { login?: string; owner?: string; name?: string },
): BadgeEntityRef | null {
  if (kind === 'repo') {
    const repo = params.owner && params.name ? parseRepoParams(params.owner, params.name) : null;
    return repo ? { kind, ...repo } : null;
  }
  const login = params.login ? decode(params.login) : null;
  return login && isGithubLogin(login) ? { kind, login } : null;
}

/** Where a package's badge images start, and where its builder facts are. */
export const PACKAGE_IMAGE_BASE = '/badge/package/';
export const PACKAGE_FACTS_BASE = '/api/badge/v3/package/';

/**
 * The package a badge path names: its registry and the name's one or two parts, decoded (as a route handler gets
 * them); `null` when they cannot name one. `spelled`, the path as it was asked for, tells whether it spelled the name
 * as the package's badges do (`@scope`, nothing else encoded), after `base`. Left out, it did.
 */
export function parsePackageRef(
  registry: string,
  parts: readonly string[],
  spelled?: string,
  base = PACKAGE_IMAGE_BASE,
): Extract<BadgeEntityRef, { kind: 'package' }> | null {
  const pkg = parseDecodedPackageParams(registry, parts);
  if (!pkg) return null;
  const plain = `${base}${badgeNamePath({ kind: 'package', registry: pkg.registry, name: pkg.name })}`;
  // An image's path goes on to its file; the facts' path ends with the name.
  const canonical =
    spelled === undefined || (base === PACKAGE_FACTS_BASE ? spelled === plain : spelled.startsWith(`${plain}/`));
  return { kind: 'package', registry: pkg.registry, name: pkg.name, canonical };
}

/**
 * Answers `/badge/{user|org|repo|package}/…/{badge}.{svg|png}`: the image; a 308 to the stored spelling (and for a
 * package, to `@scope` from `%40scope`); a 400 for a bad query; a 404 for an unknown entity or badge; a short-cached
 * 503 when the data cannot be read or drawn.
 */
export async function getBadgeResponse(
  ref: BadgeEntityRef | null,
  file: string,
  search: URLSearchParams,
  loaders: BadgeLoaders,
  now = new Date(),
): Promise<Response> {
  const parsed = parseBadgeFile(file);
  const badge = ref && parsed ? findBadge(ref.kind, parsed.id) : null;
  if (!ref || !parsed || !badge) {
    return notFound();
  }

  let params: ReturnType<typeof resolveParams>;
  try {
    params = resolveParams(badge, search);
  } catch (error) {
    if (error instanceof BadgeParamsError) {
      return text(`Invalid query: ${error.message}`, 400, BADGE_CACHE_HEADERS.badRequest);
    }
    throw error;
  }

  let entity: EntityFacts | PackageNotRead | null;
  try {
    entity = await loadEntity(ref, loaders);
  } catch (error) {
    console.error('Error reading badge data:', error);
    return unavailable();
  }
  // A package held and not read yet has no badge; its first read comes soon, so the miss is kept for minutes only.
  if (entity === PACKAGE_NOT_READ) {
    return text('Badge not found', 404, BADGE_CACHE_HEADERS.provisional);
  }
  if (!entity) {
    return notFound();
  }

  // Case variants and old names share the stored spelling's cache entry.
  const stored = storedNameOf(entity);
  if (stored !== requestedName(ref) || (ref.kind === 'package' && !ref.canonical)) {
    const query = search.toString();
    return new Response(null, {
      status: 308,
      headers: {
        Location: `${pathOf(ref.kind, entity)}/${file}${query ? `?${query}` : ''}`,
        ...BADGE_CACHE_HEADERS.badge,
      },
    });
  }

  try {
    const rendered = await renderBadge(entity, badge, params, parsed.format, now);
    if (badge.id === 'contribute' && entity.kind === 'repo' && entity.githubId && loaders.onContributeSeen) {
      try {
        loaders.onContributeSeen(entity.githubId);
      } catch (error) {
        console.error('Error reporting a badge:', error);
      }
    }
    if (badge.id !== 'contribute' && entity.kind !== 'org' && loaders.onImageServed) {
      try {
        loaders.onImageServed(entity.kind, stored);
      } catch (error) {
        console.error('Error reporting a badge:', error);
      }
    }
    return new Response(rendered.body, {
      headers: {
        'Content-Type': rendered.contentType,
        ...(rendered.state === 'badge' ? BADGE_CACHE_HEADERS.badge : BADGE_CACHE_HEADERS.provisional),
      },
    });
  } catch (error) {
    console.error('Error drawing a badge:', error);
    return unavailable();
  }
}

function unavailable() {
  return new Response(null, {
    status: 503,
    headers: { ...BADGE_CACHE_HEADERS.unavailable, 'Retry-After': '60' },
  });
}
