import { absoluteUrl, SITE_DESCRIPTION, SITE_NAME, SITE_SAME_AS, SITE_URL } from './site';
import { SOCIAL_CARD_SIZE } from '@/badge/v3/links';

/** The site Organization node, emitted on every page; other nodes point at it by `@id`. */
export const ORGANIZATION_ID = `${SITE_URL}/#organization`;

export function buildSiteJsonLd() {
  return [
    {
      '@context': 'https://schema.org',
      '@type': 'WebSite',
      '@id': `${SITE_URL}/#website`,
      url: SITE_URL,
      name: SITE_NAME,
      description: SITE_DESCRIPTION,
      inLanguage: 'en',
      publisher: { '@id': ORGANIZATION_ID },
    },
    {
      '@context': 'https://schema.org',
      '@type': 'Organization',
      '@id': ORGANIZATION_ID,
      name: SITE_NAME,
      url: SITE_URL,
      description: SITE_DESCRIPTION,
      logo: absoluteUrl('/apple-icon.png'),
      sameAs: SITE_SAME_AS,
    },
  ];
}

type RankingListItem = {
  /** The rank shown in the table. */
  position: number;
  name: string;
  path: string;
};

/** One ranking page as an `ItemList` of the profiles it lists, in table order; `null` for an empty page. */
export function buildRankingItemList(name: string, path: string, items: RankingListItem[]) {
  if (!items.length) {
    return null;
  }

  return {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name,
    url: absoluteUrl(path),
    numberOfItems: items.length,
    itemListOrder: 'https://schema.org/ItemListOrderAscending',
    itemListElement: items.map((item) => ({
      '@type': 'ListItem',
      position: item.position,
      name: item.name,
      url: absoluteUrl(item.path),
    })),
  };
}

/** An entity page's images: the avatar the page draws as its main image, and its card drawn at 1200×630. */
export type EntityImages = {
  /** The entity's page, absolute (a developer's overview, for every tab): the images' `@id`s are on it. */
  entityUrl: string;
  avatar: { url: string; caption: string } | null;
  card: { url: string; caption: string } | null;
};

/**
 * The schema.org `image` of a developer, an organization or a repository: the avatar, then the card when it has one,
 * each an `ImageObject` with its caption (the card with its size). Pages name the avatar as their primary image by
 * its `@id` (see `primaryImageOfPage`) rather than repeating it.
 */
export function entityJsonLdImage({ entityUrl, avatar, card }: EntityImages) {
  const images = [
    avatar && {
      '@type': 'ImageObject',
      '@id': `${entityUrl}#avatar`,
      url: avatar.url,
      contentUrl: avatar.url,
      caption: avatar.caption,
    },
    card && {
      '@type': 'ImageObject',
      '@id': `${entityUrl}#card`,
      url: card.url,
      contentUrl: card.url,
      encodingFormat: 'image/png',
      ...SOCIAL_CARD_SIZE,
      caption: card.caption,
    },
  ].filter((image) => !!image);
  return images.length > 1 ? images : images[0];
}

/** The page's main image, the avatar it draws at the top, by its `@id` in the entity's `image`. */
export const primaryImageOfPage = ({ entityUrl, avatar }: EntityImages) =>
  avatar ? { '@id': `${entityUrl}#avatar` } : undefined;
