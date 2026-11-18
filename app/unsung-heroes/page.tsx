'use cache';

import type { Metadata } from 'next';
import { cacheTag } from 'next/cache';

import { ARCHIVE_UNAVAILABLE } from './archive';
import { fetchUnsungHeroes } from './archive-read';
import { UnsungHeroesScreen } from './components/unsung-heroes-screen';
import { archiveJsonLdOf, archiveMetadataOf } from './seo';
import { UNSUNG_HERO_CACHE_TAG } from '@/lib/unsung-hero/unsung-hero';

// One cached page for everyone it is shown to, under the tag `unsung-hero`: every change of a hero expires it. Who may
// see it is decided before it renders (the page is on the packages gate's path list), never here, so its metadata is
// its final metadata from the first render.

export async function generateMetadata(): Promise<Metadata> {
  const archive = await fetchUnsungHeroes();
  return archiveMetadataOf(archive === ARCHIVE_UNAVAILABLE ? null : archive);
}

export default async function UnsungHeroesPage() {
  cacheTag(UNSUNG_HERO_CACHE_TAG);
  const archive = await fetchUnsungHeroes();
  return (
    <UnsungHeroesScreen
      archive={archive}
      jsonLd={archive === ARCHIVE_UNAVAILABLE ? undefined : archiveJsonLdOf(archive)}
    />
  );
}
