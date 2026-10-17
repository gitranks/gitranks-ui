import { absoluteUrl, SITE_DESCRIPTION, SITE_NAME, SITE_SAME_AS, SITE_URL } from './site';

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
