import { findBadge } from './catalogue';
import type { EntityFacts } from './facts';
import { BadgeParamsError, resolveParams } from './params';
import { renderBadge } from './render';
import type { EntityKind, ImageFormat } from './types';
import { isGithubLogin } from '@/utils/profile-refresh';
import { parseRepoParams } from '@/utils/repo-paths';

/** Cache rules of the v3 badge URLs (spec §5.3, §5.4). */
export const BADGE_CACHE_CONTROL = {
  /** Badge data moves at most daily: long at the edge, short in the browser; the last good image outlives an outage. */
  badge: 'public, max-age=300, s-maxage=86400, stale-while-revalidate=604800, stale-if-error=604800',
  /** "not yet" and star history being prepared: short at the edge, so the real image replaces them soon. */
  provisional: 'public, max-age=300, s-maxage=3600',
  /** Misses are cached too, so a made-up name costs no data read or drawing at every request. */
  notFound: 'public, max-age=300, s-maxage=86400',
  badRequest: 'public, max-age=300, s-maxage=86400',
  /** A failed read or drawing: the edge keeps serving its last good copy meanwhile. */
  unavailable: 'public, max-age=60, s-maxage=60',
} as const;

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

const text = (body: string, status: number, cacheControl: string) =>
  new Response(body, {
    status,
    headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': cacheControl },
  });

const notFound = () => text('Badge not found', 404, BADGE_CACHE_CONTROL.notFound);

/** The entity a badge URL names, as the request spells it. */
export type BadgeEntityRef = { kind: 'user' | 'org'; login: string } | { kind: 'repo'; owner: string; name: string };

/** How the entity is spelled in a URL path, from its stored name. */
function pathOf(kind: EntityKind, entity: EntityFacts): string {
  const name = entity.kind === 'repo' ? entity.nameWithOwner : entity.login;
  return `/badge/${kind}/${name.split('/').map(encodeURIComponent).join('/')}`;
}

function requestedName(ref: BadgeEntityRef) {
  return ref.kind === 'repo' ? `${ref.owner}/${ref.name}` : ref.login;
}

export type BadgeLoaders = {
  user: (login: string) => Promise<EntityFacts | null>;
  org: (login: string) => Promise<EntityFacts | null>;
  repo: (owner: string, name: string) => Promise<EntityFacts | null>;
};

/** The entity a route's params name, decoded and checked; `null` when they cannot name one. */
export function parseEntityRef(
  kind: EntityKind,
  params: { login?: string; owner?: string; name?: string },
): BadgeEntityRef | null {
  if (kind === 'repo') {
    const repo = params.owner && params.name ? parseRepoParams(params.owner, params.name) : null;
    return repo ? { kind, ...repo } : null;
  }
  const login = params.login ? decode(params.login) : null;
  return login && isGithubLogin(login) ? { kind, login } : null;
}

/**
 * Answers `/badge/{user|org|repo}/…/{badge}.{svg|png}`: the image; a 308 to the stored spelling; a 400 for a bad
 * query; a 404 for an unknown entity or badge; a short-cached 503 when the data cannot be read or drawn.
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
      return text(`Invalid query: ${error.message}`, 400, BADGE_CACHE_CONTROL.badRequest);
    }
    throw error;
  }

  let entity: EntityFacts | null;
  try {
    entity = ref.kind === 'repo' ? await loaders.repo(ref.owner, ref.name) : await loaders[ref.kind](ref.login);
  } catch (error) {
    console.error('Error reading badge data:', error);
    return unavailable();
  }
  if (!entity) {
    return notFound();
  }

  // Case variants and old names share the stored spelling's cache entry.
  const stored = entity.kind === 'repo' ? entity.nameWithOwner : entity.login;
  if (stored !== requestedName(ref)) {
    const query = search.toString();
    return new Response(null, {
      status: 308,
      headers: {
        Location: `${pathOf(ref.kind, entity)}/${file}${query ? `?${query}` : ''}`,
        'Cache-Control': BADGE_CACHE_CONTROL.badge,
      },
    });
  }

  try {
    const rendered = await renderBadge(entity, badge, params, parsed.format, now);
    return new Response(rendered.body, {
      headers: {
        'Content-Type': rendered.contentType,
        'Cache-Control': rendered.state === 'badge' ? BADGE_CACHE_CONTROL.badge : BADGE_CACHE_CONTROL.provisional,
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
    headers: { 'Cache-Control': BADGE_CACHE_CONTROL.unavailable, 'Retry-After': '60' },
  });
}
