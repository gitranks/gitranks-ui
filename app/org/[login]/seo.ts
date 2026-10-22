import type { Metadata } from 'next';

import { clipText } from '@/lib/seo/clip-text';
import { pageMetadata } from '@/lib/seo/page-metadata';
import { absoluteUrl } from '@/lib/seo/site';
import type { PageOrgQuery } from '@/types/generated/graphql';
import { ensureLinkProtocol } from '@/utils/ensure-link-protocol';
import { formatNumberShort } from '@/utils/format-number-short';
import { formatOrdinal } from '@/utils/format-ordinal';

type DataType = NonNullable<PageOrgQuery['organization']>;

const clip = (t: string) => clipText(t, 158);

function buildOverviewDescription(stats: DataType): string {
  const { s, rankOrg } = stats ?? {};

  const parts = [
    rankOrg?.s ? `Global rank: ${formatOrdinal(rankOrg.s)}.` : undefined,
    s != null ? `${formatNumberShort(s)} stars.` : undefined,
  ];

  return clip(parts.filter(Boolean).join(' '));
}

function buildBreadcrumbs(name: string, url: string) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: absoluteUrl('/') },
      { '@type': 'ListItem', position: 2, name, item: url },
    ],
  };
}

function buildTabSpecificJsonLd(data: DataType, url: string, title: string, description: string, avatarUrl: string) {
  const { login, name, websiteUrl } = data;
  // The links the sidebar shows: GitHub and the organization's website.
  const sameAs = [`https://github.com/${login}`, ensureLinkProtocol(websiteUrl)].filter(
    (link): link is string => !!link && URL.canParse(link),
  );

  return {
    '@context': 'https://schema.org',
    '@type': 'ProfilePage',
    url,
    name: title,
    description,
    mainEntity: {
      '@type': 'Organization',
      name: name || login,
      alternateName: login,
      url,
      image: avatarUrl,
      sameAs,
    },
  };
}

/** Metadata for an organization page and the JSON-LD to render on it. */
export function buildOrgSEO(data: DataType): { metadata: Metadata; jsonLd: object[] } {
  const { login, name } = data;

  if (!login) {
    return { metadata: {}, jsonLd: [] };
  }

  const avatarUrl = absoluteUrl(`/api/avatar/${encodeURIComponent(login)}`);

  const userName = `${login}${name ? ` (${name})` : ''}`;
  const path = `/org/${encodeURIComponent(login)}`;
  const url = absoluteUrl(path);
  const title = `${name || login} - GitHub Analytics`;
  const description = buildOverviewDescription(data) || `GitHub analytics for the ${name || login} organization.`;

  const breadcrumbs = buildBreadcrumbs(userName, url);
  const tabSpecificJsonLd = buildTabSpecificJsonLd(data, url, title, description, avatarUrl);

  return {
    metadata: {
      ...pageMetadata({ title, description, path, images: [avatarUrl], openGraphType: 'profile' }),
      robots: {
        index: true,
        follow: true,
        'max-image-preview': 'large',
        'max-snippet': -1,
        'max-video-preview': -1,
      },
    },
    jsonLd: [tabSpecificJsonLd, breadcrumbs],
  };
}

/** Metadata for an organization's Pulse tab. Its chart loads in the browser, so it has no JSON-LD of its own. */
export function buildOrgPulseMetadata(data: DataType): Metadata {
  const { login, name } = data;

  if (!login) {
    return {};
  }

  const path = `/org/${encodeURIComponent(login)}/pulse`;

  return pageMetadata({
    title: `${name || login} - Pulse`,
    description: clip(
      `Activity by type for the ${name || login} organization: each month's share of changed files in its public repositories, by type, language or kind.`,
    ),
    path,
    images: [absoluteUrl(`/api/avatar/${encodeURIComponent(login)}`)],
    openGraphType: 'profile',
  });
}
