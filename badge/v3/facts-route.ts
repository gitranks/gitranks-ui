import { USER_WALL_OFFERED } from './catalogue';
import type { EntityFacts } from './facts';
import { readsSoon } from './pending';
import { type BadgeEntityRef, type BadgeLoaders, parseEntityRef, parsePackageRef } from './route';
import type { EntityKind } from './types';

/**
 * The builder asks again within minutes; a miss, and an entity whose data will change soon on its own (see
 * `readsSoon`), are kept shorter, so the change shows up soon.
 */
export const FACTS_CACHE_CONTROL = {
  found: 'public, max-age=300, s-maxage=3600',
  awaitingRead: 'public, max-age=60, s-maxage=300',
  notFound: 'public, max-age=60, s-maxage=300',
  unavailable: 'public, max-age=30, s-maxage=30',
} as const;

const KINDS: readonly EntityKind[] = ['user', 'org', 'repo', 'package'];

/** The entity a facts path names: a login, `owner/name`, or `npm/<name>` (a scoped name in two parts). */
function refOf(kind: EntityKind | undefined, name: string[]): BadgeEntityRef | null {
  switch (kind) {
    case undefined:
      return null;
    case 'repo':
      return name.length === 2 ? parseEntityRef('repo', { owner: name[0], name: name[1] }) : null;
    case 'package':
      return name.length >= 2 ? parsePackageRef(name[0], name.slice(1)) : null;
    default:
      return name.length === 1 ? parseEntityRef(kind, { login: name[0] }) : null;
  }
}

const json = (body: unknown, status: number, cacheControl: string) =>
  Response.json(body, { status, headers: { 'Cache-Control': cacheControl } });

/**
 * Answers `/api/badge/v3/{user|org|repo|package}/…` with the entity's badge facts as JSON, so the builder decides on
 * the page what is available, with the same rules as the images: 404 for an unknown entity or a name that cannot be
 * one, 503 when the data cannot be read.
 */
export async function getEntityFactsResponse(kind: string, name: string[], loaders: BadgeLoaders): Promise<Response> {
  const ref = refOf(
    KINDS.find((known) => known === kind),
    name,
  );
  if (!ref) {
    return json({ error: 'Not found' }, 404, FACTS_CACHE_CONTROL.notFound);
  }

  let facts: EntityFacts | null;
  try {
    switch (ref.kind) {
      case 'repo':
        facts = await loaders.repo(ref.owner, ref.name);
        break;
      case 'package':
        facts = loaders.package ? await loaders.package(ref.name) : null;
        break;
      default:
        facts = await loaders[ref.kind](ref.login);
    }
  } catch (error) {
    console.error('Error reading badge facts:', error);
    return json({ error: 'Unavailable' }, 503, FACTS_CACHE_CONTROL.unavailable);
  }
  if (!facts) {
    return json({ error: 'Not found' }, 404, FACTS_CACHE_CONTROL.notFound);
  }
  return json(publicFacts(facts), 200, readsSoon(facts) ? FACTS_CACHE_CONTROL.awaitingRead : FACTS_CACHE_CONTROL.found);
}

/** The facts the builder may use: a developer's wall stays out while that wall is not offered. */
export function publicFacts(facts: EntityFacts): EntityFacts {
  if (facts.kind !== 'user' || USER_WALL_OFFERED) return facts;
  return { ...facts, contributorsWall: {}, wallRepos: null };
}
