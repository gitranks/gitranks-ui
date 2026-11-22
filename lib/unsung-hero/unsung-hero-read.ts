import 'server-only';

import { cacheLife, cacheTag } from 'next/cache';

import { UNSUNG_HERO_CACHE_TAG, type UnsungHero } from './unsung-hero';
import { type ApiUnsungHero, UnsungHeroCurrentDocument } from './unsung-hero.documents';
import { graphqlDirect } from '@/lib/graphql/graphql-direct';

/** Kept 10 minutes. Every change of the hero (a new week, an end, an opt-out) expires the tag; its star count may lag. */
const HERO_LIFE = { stale: 60, revalidate: 600, expire: 86_400 };

/** The hero as the card draws it; the fields are taken one by one, so nothing else of the answer passes. */
export const heroOf = (hero: ApiUnsungHero): UnsungHero => ({
  week: hero.week,
  startsAt: hero.startsAt,
  endsAt: hero.endsAt,
  repo: { nameWithOwner: hero.repo.nameWithOwner },
  package: { registry: hero.package.registry, name: hero.package.name },
  line: hero.line,
  weeklyDownloads: hero.facts.weeklyDownloads,
  starsAtStart: hero.starsAtStart ?? null,
  starsGained: Math.max(0, hero.starsGained ?? 0),
});

/**
 * This week's hero, one read shared by every visitor and kept on the server, tagged `unsung-hero`: `null` in a week
 * with none. Asked as the site itself. A failed read throws and is not kept.
 */
export async function fetchUnsungHero(): Promise<UnsungHero | null> {
  'use cache';
  cacheTag(UNSUNG_HERO_CACHE_TAG);
  cacheLife(HERO_LIFE);

  const { unsungHero } = (await graphqlDirect(UnsungHeroCurrentDocument)) ?? {};
  return unsungHero ? heroOf(unsungHero) : null;
}
