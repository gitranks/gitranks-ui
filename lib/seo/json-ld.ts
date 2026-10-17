import { absoluteUrl, SITE_DESCRIPTION, SITE_NAME, SITE_SOCIAL_LINKS, SITE_URL } from './site';

const ORGANIZATION_ID = `${SITE_URL}/#organization`;

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
      logo: absoluteUrl('/apple-icon.png'),
      sameAs: Object.values(SITE_SOCIAL_LINKS),
    },
  ];
}

type RankingListItem = {
  /** The rank shown in the table. */
  position: number;
  name: string;
  path: string;
};

/** One ranking page as an `ItemList` of the profiles it lists, in table order. */
export function buildRankingItemList(name: string, path: string, items: RankingListItem[]) {
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
