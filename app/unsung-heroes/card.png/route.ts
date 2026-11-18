import { cacheTag } from 'next/cache';

import { ARCHIVE_UNAVAILABLE } from '../archive';
import { drawArchiveCard } from '../archive-card';
import { fetchUnsungHeroes } from '../archive-read';
import { UNSUNG_HERO_CACHE_TAG } from '@/lib/unsung-hero/unsung-hero';

/** The card drawn once per change of the archive and kept under its tag, as the page is. */
async function archiveCardPng() {
  'use cache';
  cacheTag(UNSUNG_HERO_CACHE_TAG);
  const archive = await fetchUnsungHeroes();
  return drawArchiveCard(archive === ARCHIVE_UNAVAILABLE ? null : archive);
}

/**
 * `/unsung-heroes/card.png`: the archive's link preview, this week's hero or the archive itself. Under the archive's
 * path, so it is hidden from whoever the page is hidden from. Reads no query: the `?week=` the page names it with only
 * tells link previews apart.
 */
export async function GET() {
  return new Response(await archiveCardPng(), { headers: { 'Content-Type': 'image/png' } });
}
