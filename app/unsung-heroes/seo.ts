import type { Metadata } from 'next';

import {
  ARCHIVE_TITLE,
  type Archive,
  type ArchiveHero,
  archiveDescriptionOf,
  formatCompactCount,
  formatFullCount,
} from './archive';
import { SOCIAL_CARD_SIZE } from '@/badge/v3/links';
import { pageMetadata } from '@/lib/seo/page-metadata';
import { absoluteUrl } from '@/lib/seo/site';
import { heroUsagePhrase } from '@/lib/unsung-hero/hero-usage';
import { UNSUNG_HEROES_PATH } from '@/lib/unsung-hero/unsung-hero';

/** The archive's own link preview image, 1200×630: the week's hero, or the archive itself in a week with none. */
export const ARCHIVE_CARD_PATH = `${UNSUNG_HEROES_PATH}/card.png`;
export const ARCHIVE_CARD_SIZE = SOCIAL_CARD_SIZE;

/**
 * The preview image's address. It names the week it shows, so a site that keeps a link preview by its image's address
 * takes the next week's as a new image; the image itself reads no query.
 */
export function archiveCardUrlOf(archive: Archive | null): string {
  const week = archive?.live?.startsAt.slice(0, 10);
  return absoluteUrl(week ? `${ARCHIVE_CARD_PATH}?week=${week}` : ARCHIVE_CARD_PATH);
}

/** The preview image's alt text: what it shows. */
export function archiveCardAltOf(archive: Archive | null): string {
  const live = archive?.live;
  if (!live) return 'GitRanks Unsung heroes: one open-source project a week that a lot of software runs on';
  const stars = live.starsAtStart === null ? '' : `, ${formatFullCount(live.starsAtStart)} stars`;
  const used = heroUsagePhrase(live.usage, live.usage.downloads === null ? formatFullCount : formatCompactCount);
  return `This week's Unsung hero on GitRanks: ${live.repo.nameWithOwner}${used ? `, ${used}` : ''}${stars}`;
}

/**
 * The archive's title, description, canonical and link preview. The same for everyone it is shown to. While the archive
 * cannot be read the page is kept out of search engines.
 */
export function archiveMetadataOf(archive: Archive | null): Metadata {
  const metadata = pageMetadata({
    title: ARCHIVE_TITLE,
    description: archiveDescriptionOf(archive),
    path: UNSUNG_HEROES_PATH,
    images: [{ url: archiveCardUrlOf(archive), ...ARCHIVE_CARD_SIZE, alt: archiveCardAltOf(archive) }],
  });
  return archive ? metadata : { ...metadata, robots: { index: false } };
}

/** The heroes in the page's order: this week's, then the past ones, newest first. */
const heroesOf = (archive: Archive): { hero: ArchiveHero; description: string }[] => [
  ...(archive.live ? [{ hero: archive.live, description: archive.live.text }] : []),
  ...archive.past.map((hero) => ({ hero, description: hero.line })),
];

/**
 * The archive as structured data: a `CollectionPage` whose main entity is the `ItemList` of its heroes as
 * `SoftwareSourceCode`, and the breadcrumbs Home › Unsung heroes. Only what the page shows.
 */
export function archiveJsonLdOf(archive: Archive): object[] {
  const url = absoluteUrl(UNSUNG_HEROES_PATH);
  const heroes = heroesOf(archive);
  const itemList = heroes.length
    ? {
        '@type': 'ItemList',
        numberOfItems: heroes.length,
        itemListOrder: 'https://schema.org/ItemListOrderDescending',
        itemListElement: heroes.map(({ hero, description }, i) => ({
          '@type': 'ListItem',
          position: i + 1,
          item: {
            '@type': 'SoftwareSourceCode',
            name: hero.repo.nameWithOwner,
            codeRepository: `https://github.com/${hero.repo.nameWithOwner}`,
            description,
          },
        })),
      }
    : undefined;

  return [
    {
      '@context': 'https://schema.org',
      '@type': 'CollectionPage',
      name: ARCHIVE_TITLE,
      description: archiveDescriptionOf(archive),
      url,
      ...(itemList ? { mainEntity: itemList } : {}),
    },
    {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Home', item: absoluteUrl('/') },
        { '@type': 'ListItem', position: 2, name: 'Unsung heroes', item: url },
      ],
    },
  ];
}
