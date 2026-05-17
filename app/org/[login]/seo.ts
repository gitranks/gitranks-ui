import type { PageOrgQuery } from '@/types/generated/graphql';
import { formatNumberShort } from '@/utils/format-number-short';
import { formatOrdinal } from '@/utils/format-ordinal';

type DataType = NonNullable<PageOrgQuery['organization']>;

const clip = (t: string, max = 158) => {
  if (!t || t.length <= max) return t;
  const cut = t.slice(0, max - 1);
  const i = cut.lastIndexOf(' ');
  return `${i > 80 ? cut.slice(0, i) : cut}…`;
};

function buildOverviewDescription(stats: DataType): string {
  const { s, rankOrg } = stats ?? {};

  const parts = [
    rankOrg?.s ? `Global rank: ${formatOrdinal(rankOrg.s)}.` : undefined,
    s != null ? `${formatNumberShort(s)} stars.` : undefined,
  ];

  return clip(parts.filter(Boolean).join(' '));
}

function buildOpenGraphAndTwitter(title: string, description: string, url: string, ogImage?: string) {
  const openGraph = {
    title,
    description,
    url,
    type: 'profile' as const,
    images: ogImage ? [{ url: ogImage }] : undefined,
  };

  const twitter = {
    card: 'summary_large_image' as const,
    title,
    description,
    images: ogImage ? [ogImage] : undefined,
  };

  return { openGraph, twitter };
}

function buildBreadcrumbs(name: string, url: string) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: process.env.NEXT_PUBLIC_URI },
      { '@type': 'ListItem', position: 2, name, item: url },
    ],
  };
}

function buildTabSpecificJsonLd(url: string, title: string, description: string, name: string, avatarUrl?: string) {
  return {
    '@context': 'https://schema.org',
    '@type': 'ProfilePage',
    url,
    name: title,
    description,
    mainEntity: {
      '@type': 'Organization',
      name,
      url,
      ...(avatarUrl && { image: avatarUrl }),
    },
  };
}

export function buildOrgSEO(data: DataType) {
  const { login, name } = data;

  if (!login) {
    return { jsonLd: [] };
  }

  const avatarUrl = `${process.env.NEXT_PUBLIC_URI}/api/avatar/${encodeURIComponent(login)}`;

  const userName = `${login}${name ? ` (${name})` : ''}`;
  const url = `${process.env.NEXT_PUBLIC_URI}/org/${encodeURIComponent(login)}`;
  const title = `${name} - GitHub Analytics | GitRanks`;
  const description = buildOverviewDescription(data);

  const { openGraph, twitter } = buildOpenGraphAndTwitter(title, description, url, avatarUrl);

  const breadcrumbs = buildBreadcrumbs(userName, url);
  const tabSpecificJsonLd = buildTabSpecificJsonLd(url, title, description, userName, avatarUrl);
  const jsonLd = [tabSpecificJsonLd, breadcrumbs];

  return {
    title,
    description,
    openGraph,
    twitter,
    robots: {
      index: true,
      follow: true,
      'max-image-preview': 'large',
      'max-snippet': -1,
      'max-video-preview': -1,
    } as const,
    jsonLd,
  };
}
