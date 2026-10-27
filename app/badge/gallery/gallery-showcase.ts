import { cacheLife } from 'next/cache';

import { fetchLeaderboards, fetchTopOrgs, fetchTopRepos } from '@/app/components/landing/landing-data';
import type { EntityFacts } from '@/badge/v3/facts';
import { loadBadgeOrg, loadBadgeRepo, loadBadgeUser } from '@/badge/v3/load';
import type { EntityKind } from '@/badge/v3/types';

/** The #1 of each ranking, by the name its badge URLs use; `null` where a ranking could not be read or is empty. */
export type ShowcaseNames = Record<EntityKind, string | null>;

/**
 * Today's #1 developer (by stars), repository and organization. It reads the rankings the landing page reads, and
 * keeps the names for a day.
 */
export async function fetchShowcaseNames(): Promise<{ names: ShowcaseNames; ok: boolean }> {
  'use cache';

  const [users, repos, orgs] = await Promise.allSettled([fetchLeaderboards(), fetchTopRepos(), fetchTopOrgs()]);
  const names: ShowcaseNames = {
    user: users.status === 'fulfilled' ? (users.value.s[0]?.user?.login ?? null) : null,
    repo: repos.status === 'fulfilled' ? (repos.value[0]?.repo?.nameWithOwner ?? null) : null,
    org: orgs.status === 'fulfilled' ? (orgs.value[0]?.organization?.login ?? null) : null,
  };
  const ok = Object.values(names).every((name) => name !== null);
  // A missing #1 comes back within minutes.
  if (ok) {
    cacheLife('days');
  } else {
    cacheLife('minutes');
  }

  return { names, ok };
}

/** The #1's badge data; `ok: false` when there is no #1 to show or its data could not be read. */
export async function loadShowcase(
  kind: EntityKind,
  name: string | null,
): Promise<{ facts: EntityFacts | null; ok: boolean }> {
  if (!name) return { facts: null, ok: false };
  try {
    let facts: EntityFacts | null;
    if (kind === 'repo') {
      const [owner, repo] = name.split('/');
      facts = await loadBadgeRepo(owner, repo);
    } else {
      facts = await (kind === 'user' ? loadBadgeUser(name) : loadBadgeOrg(name));
    }
    return { facts, ok: !!facts };
  } catch (error) {
    console.error('Error reading badge data for the gallery:', error);
    return { facts: null, ok: false };
  }
}
