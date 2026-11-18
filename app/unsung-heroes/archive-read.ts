import 'server-only';

import { cacheLife, cacheTag } from 'next/cache';

import { ARCHIVE_UNAVAILABLE, type Archive, archiveOf } from './archive';
import { UnsungHeroesDocument } from './archive.documents';
import { graphqlDirect } from '@/lib/graphql/graphql-direct';
import { UNSUNG_HERO_CACHE_TAG } from '@/lib/unsung-hero/unsung-hero';

/**
 * Kept an hour at most: every change of a hero (a new week, an end, an opt-out, the hourly star count) expires the tag,
 * so the page follows at once. Spelled out because the stock 'hours' profile is zero in development.
 */
const ARCHIVE_LIFE = { stale: 300, revalidate: 3_600, expire: 86_400 };

/**
 * The archive, one read shared by every visitor and kept on the server under the tag `unsung-hero`. Asked as the site:
 * who may see the page is decided before it renders, never here. While it cannot be read (or the API answers nothing)
 * it is `unavailable`, kept for minutes only.
 */
export async function fetchUnsungHeroes(): Promise<Archive | typeof ARCHIVE_UNAVAILABLE> {
  'use cache';
  cacheTag(UNSUNG_HERO_CACHE_TAG);

  try {
    const { unsungHeroes } = (await graphqlDirect(UnsungHeroesDocument)) ?? {};
    if (unsungHeroes) {
      const archive = archiveOf(unsungHeroes);
      cacheLife(ARCHIVE_LIFE);
      return archive;
    }
  } catch {
    // Unavailable below.
  }
  cacheLife('minutes');
  return ARCHIVE_UNAVAILABLE;
}
