import { RANK_NAME } from '@/badge/badge.consts';
import type { PageProfileLanguagesQuery, PageProfileOverviewQuery } from '@/types/generated/graphql';
import { formatNumberShort } from '@/utils/format-number-short';
import { formatOrdinal } from '@/utils/format-ordinal';

type Tab = 'overview' | 'ranks' | 'repositories' | 'languages';
type DataType = NonNullable<PageProfileOverviewQuery['user']>;
type LanguagesType = NonNullable<PageProfileLanguagesQuery['user']>['languages'];

const clip = (t: string, max = 158) => {
  if (!t || t.length <= max) return t;
  const cut = t.slice(0, max - 1);
  const i = cut.lastIndexOf(' ');
  return `${i > 80 ? cut.slice(0, i) : cut}…`;
};

function buildUrl(tab: Tab, base: string): string {
  switch (tab) {
    case 'overview':
      return base;
    case 'ranks':
    case 'repositories':
    case 'languages':
      return `${base}/${tab}`;
  }
}

function buildTitle(tab: Tab, name: string): string {
  const titles: Record<Tab, string> = {
    overview: `${name} - GitHub Analytics | GitRanks`,
    ranks: `${name} - Ranks | GitRanks`,
    repositories: `${name} - Repositories & Contributions | GitRanks`,
    languages: `${name} - Language Ranks | GitRanks`,
  };
  return titles[tab];
}

function getBestRank(rankGlobal?: NonNullable<DataType>['rankGlobal']): number | undefined {
  return [rankGlobal?.s, rankGlobal?.c, rankGlobal?.f]
    .filter((x): x is number => typeof x === 'number')
    .sort((a, b) => a - b)[0];
}

function buildOverviewDescription(stats: DataType): string {
  const { s, c, f, rankGlobal, repositories } = stats ?? {};
  const bestRank = getBestRank(rankGlobal);
  const topRepo = repositories?.[0];

  const parts = [
    bestRank ? `Global rank: ${formatOrdinal(bestRank)}.` : undefined,
    s != null ? `⭐${formatNumberShort(s)} owned.` : undefined,
    c != null ? `⭐${formatNumberShort(c)} contributed.` : undefined,
    f != null ? `👥${formatNumberShort(f)} followers.` : undefined,
    topRepo?.name
      ? `Top repo: ${topRepo.name}${topRepo.stargazerCount ? ` (⭐${formatNumberShort(topRepo.stargazerCount)})` : ''}.`
      : undefined,
  ];

  return clip(parts.filter(Boolean).join(' '));
}

function buildRanksDescription(rankGlobal?: NonNullable<DataType>['rankGlobal']): string {
  const parts = [
    rankGlobal?.s != null ? `${RANK_NAME.s} ${formatOrdinal(rankGlobal.s)}.` : undefined,
    rankGlobal?.c != null ? `${RANK_NAME.c} ${formatOrdinal(rankGlobal.c)}.` : undefined,
    rankGlobal?.f != null ? `${RANK_NAME.f} ${formatOrdinal(rankGlobal.f)}.` : undefined,
  ].filter(Boolean);

  return clip(`Ranks: ${parts.length ? parts.join(' ') : 'Not Ranked'}`);
}

function buildRepositoriesDescription(stats: DataType): string {
  const { repositories, repositoriesCount, contributedRepoCount } = stats ?? {};
  const topRepo = repositories?.[0];

  const parts = [
    repositoriesCount != null ? `Repositories: ${formatNumberShort(repositoriesCount)}.` : undefined,
    topRepo?.name
      ? `Top: ${topRepo.name}${topRepo.stargazerCount ? ` (⭐${formatNumberShort(topRepo.stargazerCount)})` : ''}.`
      : undefined,
    contributedRepoCount != null
      ? `Contributed to ${formatNumberShort(contributedRepoCount)} repositories.`
      : undefined,
  ];

  return clip(parts.filter(Boolean).join(' '));
}

function buildLanguagesDescription(languages?: LanguagesType): string {
  const languageParts =
    languages
      ?.slice(0, 3)
      .filter((l) => l.rankGlobal?.s)
      .map((l) => `${l.name} ${formatOrdinal(l.rankGlobal!.s)} (${l.score})`) ?? [];

  return languageParts.length ? clip(`Language Ranks: ${languageParts.join(', ')}`) : '';
}

function buildDescription(tab: Tab, stats: DataType): string {
  switch (tab) {
    case 'overview':
      return buildOverviewDescription(stats);
    case 'ranks':
      return buildRanksDescription(stats?.rankGlobal);
    case 'repositories':
      return buildRepositoriesDescription(stats);
    case 'languages':
      return buildLanguagesDescription(stats?.languages);
  }
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

function buildBreadcrumbs(name: string, base: string, tab: Tab, url: string) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: process.env.NEXT_PUBLIC_URI },
      { '@type': 'ListItem', position: 2, name, item: base },
      tab !== 'overview'
        ? { '@type': 'ListItem', position: 3, name: tab[0].toUpperCase() + tab.slice(1), item: url }
        : undefined,
    ].filter(Boolean),
  };
}

function buildTabSpecificJsonLd(
  tab: Tab,
  url: string,
  title: string,
  description: string,
  name: string,
  base: string,
  stats: DataType,
  avatarUrl?: string,
) {
  switch (tab) {
    case 'overview':
      return {
        '@context': 'https://schema.org',
        '@type': 'ProfilePage',
        url,
        name: title,
        description,
        mainEntity: { '@type': 'Person', name, url: base, image: avatarUrl },
      };

    case 'ranks':
      return {
        '@context': 'https://schema.org',
        '@type': 'WebPage',
        url,
        name: title,
        description,
        about: { '@type': 'Person', name, url: base },
        dataset: {
          '@type': 'Dataset',
          name: `${name} — Rank Dataset`,
          variableMeasured: [
            stats?.rankGlobal?.s
              ? { '@type': 'PropertyValue', name: RANK_NAME.s, value: stats.rankGlobal.s }
              : undefined,
            stats?.rankGlobal?.c
              ? { '@type': 'PropertyValue', name: RANK_NAME.c, value: stats.rankGlobal.c }
              : undefined,
            stats?.rankGlobal?.f
              ? { '@type': 'PropertyValue', name: RANK_NAME.f, value: stats.rankGlobal.f }
              : undefined,
          ].filter(Boolean),
        },
      };

    case 'repositories': {
      const topRepo = stats?.repositories?.[0];

      return {
        '@context': 'https://schema.org',
        '@type': 'CollectionPage',
        url,
        name: title,
        description,
        about: { '@type': 'Person', name, url: base },
        mainEntity: {
          '@type': 'ItemList',
          itemListElement: topRepo ? [{ '@type': 'ListItem', position: 1, name: topRepo.name, url: topRepo.url }] : [],
        },
      };
    }
    case 'languages':
      return {
        '@context': 'https://schema.org',
        '@type': 'CollectionPage',
        url,
        name: title,
        description,
        about: { '@type': 'Person', name, url: base },
        mainEntity: {
          '@type': 'ItemList',
          itemListElement: ((stats.languages as LanguagesType) ?? []).slice(0, 3).map((l, i) => ({
            '@type': 'ListItem',
            position: i + 1,
            name: l.name,
            description: l.rankGlobal?.s ? `Rank ${l.rankGlobal.s}` : undefined,
          })),
        },
      };
  }
}

export function buildProfileTabSEO(tab: Tab, data: DataType) {
  const { login, name } = data;
  const avatarUrl = `${process.env.NEXT_PUBLIC_URI}/api/avatar/${encodeURIComponent(login)}`;

  const userName = `${login}${name ? ` (${name})` : ''}`;
  const base = `${process.env.NEXT_PUBLIC_URI}/profile/${encodeURIComponent(login)}`;
  const url = buildUrl(tab, base);
  const title = buildTitle(tab, userName);
  const description = buildDescription(tab, data);

  const { openGraph, twitter } = buildOpenGraphAndTwitter(title, description, url, avatarUrl);

  const breadcrumbs = buildBreadcrumbs(userName, base, tab, url);
  const tabSpecificJsonLd = buildTabSpecificJsonLd(tab, url, title, description, userName, base, data, avatarUrl);
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
