import type { EntityFacts } from './facts';
import { type BadgeLoaders, parseEntityRef } from './route';
import type { EntityKind } from './types';

/** The builder asks again within minutes; a miss is kept shorter, so a profile fetched meanwhile shows up soon. */
export const FACTS_CACHE_CONTROL = {
  found: 'public, max-age=300, s-maxage=3600',
  notFound: 'public, max-age=60, s-maxage=300',
  unavailable: 'public, max-age=30, s-maxage=30',
} as const;

const KINDS: readonly EntityKind[] = ['user', 'org', 'repo'];

const json = (body: unknown, status: number, cacheControl: string) =>
  Response.json(body, { status, headers: { 'Cache-Control': cacheControl } });

/**
 * Answers `/api/badge/v3/{user|org|repo}/…` with the entity's badge facts as JSON, so the builder decides on the
 * page what is available, with the same rules as the images: 404 for an unknown entity or a name that cannot be one,
 * 503 when the data cannot be read.
 */
export async function getEntityFactsResponse(kind: string, name: string[], loaders: BadgeLoaders): Promise<Response> {
  const entityKind = KINDS.find((known) => known === kind);
  const ref = !entityKind
    ? null
    : entityKind === 'repo'
      ? name.length === 2
        ? parseEntityRef('repo', { owner: name[0], name: name[1] })
        : null
      : name.length === 1
        ? parseEntityRef(entityKind, { login: name[0] })
        : null;
  if (!ref) {
    return json({ error: 'Not found' }, 404, FACTS_CACHE_CONTROL.notFound);
  }

  let facts: EntityFacts | null;
  try {
    facts = ref.kind === 'repo' ? await loaders.repo(ref.owner, ref.name) : await loaders[ref.kind](ref.login);
  } catch (error) {
    console.error('Error reading badge facts:', error);
    return json({ error: 'Unavailable' }, 503, FACTS_CACHE_CONTROL.unavailable);
  }
  return facts
    ? json(facts, 200, FACTS_CACHE_CONTROL.found)
    : json({ error: 'Not found' }, 404, FACTS_CACHE_CONTROL.notFound);
}
