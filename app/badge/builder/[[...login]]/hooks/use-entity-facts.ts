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

/**
 * An entity's badge facts, `null` when GitRanks does not know it. A found entity is asked once per page view; a miss
 * or a failure is not kept, so asking again (after the visitor opens its GitRanks page, say) asks the site again.
 */
export function fetchEntityFacts(kind: EntityKind, name: string): Promise<EntityFacts | null> {
  const key = keyOf(kind, name);
  let request = requests.get(key);
  if (!request) {
    const path = name.split('/').map(encodeURIComponent).join('/');
    request = fetch(`/api/badge/v3/${kind}/${path}`).then(async (response) => {
      if (response.status === 404) return null;
      if (!response.ok) throw new Error(`Badge facts: ${response.status}`);
      return (await response.json()) as EntityFacts;
    });
    requests.set(key, request);
    request.then(
      (facts) => facts || requests.delete(key),
      () => requests.delete(key),
    );
  }
  return request;
}

/** Facts step 1 already holds, so the next step does not ask for them again. */
export function seedEntityFacts(facts: EntityFacts): void {
  const name = facts.kind === 'repo' ? facts.nameWithOwner : facts.login;
  requests.set(keyOf(facts.kind, name), Promise.resolve(facts));
}

/**
 * The facts of the entity the URL names, loaded on the page (the builder page itself is cached for everyone). A new
 * `attempt` asks again for the same name, after a failed lookup.
 */
export function useEntityFacts(kind: EntityKind | null, name: string | null, attempt = 0): FactsState {
  const [state, setState] = useState<FactsState & { key?: string }>({ status: 'idle' });
  const key = kind && name ? `${keyOf(kind, name)}#${attempt}` : null;

  useEffect(() => {
    if (!kind || !name || !key) {
      setState({ status: 'idle' });
      return;
    }
    let current = true;
    setState({ status: 'loading', key });
    fetchEntityFacts(kind, name).then(
      (facts) => current && setState(facts ? { status: 'found', facts, key } : { status: 'missing', key }),
      () => current && setState({ status: 'error', key }),
    );
    return () => {
      current = false;
    };
  }, [kind, name, key]);

  // Until the effect runs for a new name, the old answer is not this name's.
  return key && state.key !== key ? { status: 'loading' } : state;
}
