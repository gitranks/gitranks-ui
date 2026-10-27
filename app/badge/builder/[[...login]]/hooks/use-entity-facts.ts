'use client';

import { useEffect, useState } from 'react';

import type { EntityFacts } from '@/badge/v3/facts';
import type { EntityKind } from '@/badge/v3/types';

export type FactsState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'found'; facts: EntityFacts }
  | { status: 'missing' }
  | { status: 'error' };

const requests = new Map<string, Promise<EntityFacts | null>>();

const keyOf = (kind: EntityKind, name: string) => `${kind}:${name.toLowerCase()}`;

const encodeName = (name: string) => name.split('/').map(encodeURIComponent).join('/');

/**
 * An entity's badge facts, `null` when GitRanks does not know it. A found entity is asked once per page view; a miss
 * or a failure is not kept, so asking again (after the visitor opens its GitRanks page, say) asks the site again.
 * `fresh` asks past every cache, for an entity that may have been fetched meanwhile; its answer replaces the kept one.
 */
export function fetchEntityFacts(
  kind: EntityKind,
  name: string,
  { fresh = false }: { fresh?: boolean } = {},
): Promise<EntityFacts | null> {
  const key = keyOf(kind, name);
  let request = fresh ? undefined : requests.get(key);
  if (!request) {
    const path = `/api/badge/v3/${kind}/${encodeName(name)}`;
    // The browser checks with the site every time; this page keeps what it found itself.
    request = fetch(fresh ? `${path}?fresh=${Date.now()}` : path, { cache: fresh ? 'no-store' : 'no-cache' }).then(
      async (response) => {
        if (response.status === 404) return null;
        if (!response.ok) throw new Error(`Badge facts: ${response.status}`);
        return (await response.json()) as EntityFacts;
      },
    );
    const asked = request;
    requests.set(key, asked);
    const forget = () => requests.get(key) === asked && requests.delete(key);
    asked.then((facts) => facts || forget(), forget);
  }
  return request;
}

/** Facts step 1 already holds, so the next step does not ask for them again. */
export function seedEntityFacts(facts: EntityFacts): void {
  const name = facts.kind === 'repo' ? facts.nameWithOwner : facts.login;
  requests.set(keyOf(facts.kind, name), Promise.resolve(facts));
}

/**
 * Asks again for an entity GitRanks may have read meanwhile. The entity's page expires its cached data when it sees
 * the visitor's refresh end; the same status read is made here first, in case that page was closed before, and then
 * the facts are asked past every cache.
 */
export async function recheckEntityFacts(kind: EntityKind, name: string): Promise<EntityFacts | null> {
  let status: Promise<Response> | null = null;
  if (kind === 'repo') {
    status = fetch(`/api/repo/${encodeName(name)}/pull`, { cache: 'no-store' });
  } else if (kind === 'user') {
    status = fetch('/api/revalidate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ login: name }),
    });
  }
  // Only a nudge: the facts are asked whatever it answers.
  await status?.catch(() => null);
  return fetchEntityFacts(kind, name, { fresh: true });
}

/**
 * The facts of the entity the URL names, loaded on the page (the builder page itself is cached for everyone). A new
 * `attempt` asks again for the same name; meanwhile the facts found for that entity stay shown.
 */
export function useEntityFacts(kind: EntityKind | null, name: string | null, attempt = 0): FactsState {
  const [state, setState] = useState<FactsState & { key?: string; entity?: string | null }>({ status: 'idle' });
  const entity = kind && name ? keyOf(kind, name) : null;
  const key = entity ? `${entity}#${attempt}` : null;

  useEffect(() => {
    if (!kind || !name || !key) {
      setState({ status: 'idle' });
      return;
    }
    let current = true;
    setState((previous) =>
      previous.status === 'found' && previous.entity === entity ? previous : { status: 'loading', key, entity },
    );
    fetchEntityFacts(kind, name).then(
      (facts) =>
        current && setState(facts ? { status: 'found', facts, key, entity } : { status: 'missing', key, entity }),
      () => current && setState({ status: 'error', key, entity }),
    );
    return () => {
      current = false;
    };
  }, [kind, name, key, entity]);

  // Until the effect runs for a new name, the old answer is not this name's; the same entity's facts stay shown.
  if (key && state.key !== key) {
    return state.status === 'found' && state.entity === entity ? state : { status: 'loading' };
  }
  return state;
}
