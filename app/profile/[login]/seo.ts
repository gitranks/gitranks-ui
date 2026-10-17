import type { Metadata } from 'next';

import { RANK_NAME } from '@/badge/badge.consts';
import { clipText } from '@/lib/seo/clip-text';
import { pageMetadata } from '@/lib/seo/page-metadata';
import { absoluteUrl } from '@/lib/seo/site';
import type { PageProfileLanguagesQuery, PageProfileOverviewQuery } from '@/types/generated/graphql';
import { ensureLinkProtocol } from '@/utils/ensure-link-protocol';
import { formatNumberShort } from '@/utils/format-number-short';
import { formatOrdinal } from '@/utils/format-ordinal';

type Tab = 'overview' | 'ranks' | 'repositories' | 'languages';
/** `country` is the `/country` variant of a tab: same layout, ranks within the user's country. */
type Scope = 'global' | 'country';
type DataType = NonNullable<PageProfileOverviewQuery['user']>;
type Ranks = DataType['rankGlobal'] | DataType['rankCountry'];
type LanguagesType = NonNullable<PageProfileLanguagesQuery['user']>['sLangs'];

const TAB_TITLES: Record<Tab, string> = {
  overview: 'GitHub Analytics',
  ranks: 'Ranks',
  repositories: 'Repositories & Contributions',
  languages: 'Language Ranks',
};

const TAB_CRUMBS: Record<Tab, string> = {
  overview: 'Overview',
  ranks: 'Ranks',
  repositories: 'Repositories',
  languages: 'Languages',
};

const clip = (t: string) => clipText(t, 158);

function buildPath(tab: Tab, base: string, scope: Scope): string {
  const tabPath = tab === 'overview' ? base : `${base}/${tab}`;
  return scope === 'country' ? `${tabPath}/country` : tabPath;
}

function getBestRank(ranks?: Ranks): number | undefined {
  return [ranks?.s, ranks?.c, ranks?.f].filter((x): x is number => typeof x === 'number').sort((a, b) => a - b)[0];
}

function buildOverviewDescription(stats: DataType, ranks: Ranks, where: string): string {
  const { s, c, f, repositories } = stats ?? {};
  const bestRank = getBestRank(ranks);
  const topRepo = repositories?.[0];

  const parts = [
    bestRank ? `${where ? `Rank ${where}` : 'Global rank'}: ${formatOrdinal(bestRank)}.` : undefined,
    s != null ? `⭐${formatNumberShort(s)} owned.` : undefined,
    c != null ? `⭐${formatNumberShort(c)} contributed.` : undefined,
    f != null ? `👥${formatNumberShort(f)} followers.` : undefined,
    topRepo?.name
      ? `Top repo: ${topRepo.name}${topRepo.stargazerCount ? ` (⭐${formatNumberShort(topRepo.stargazerCount)})` : ''}.`
      : undefined,
  ];

  return clip(parts.filter(Boolean).join(' '));
}

function buildRanksDescription(ranks: Ranks, where: string): string {
  const parts = [
    ranks?.s != null ? `${RANK_NAME.s} ${formatOrdinal(ranks.s)}.` : undefined,
    ranks?.c != null ? `${RANK_NAME.c} ${formatOrdinal(ranks.c)}.` : undefined,
    ranks?.f != null ? `${RANK_NAME.f} ${formatOrdinal(ranks.f)}.` : undefined,
  ].filter(Boolean);

  return clip(`Ranks${where ? ` ${where}` : ''}: ${parts.length ? parts.join(' ') : 'Not Ranked'}`);
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

function buildLanguagesDescription(languages: LanguagesType | undefined, scope: Scope, where: string): string {
  const rankOf = (l: NonNullable<LanguagesType>[number]) => (scope === 'country' ? l.rankCountry?.s : l.rankGlobal?.s);
  const languageParts =
    languages
      ?.filter((l) => rankOf(l))
      .slice(0, 3)
      .map((l) => `${l.name} ${formatOrdinal(rankOf(l)!)} (${l.score})`) ?? [];

  return languageParts.length ? clip(`Language Ranks${where ? ` ${where}` : ''}: ${languageParts.join(', ')}`) : '';
}

function buildDescription(tab: Tab, stats: DataType, scope: Scope, where: string): string {
  const ranks = scope === 'country' ? stats?.rankCountry : stats?.rankGlobal;

  switch (tab) {
    case 'overview':
      return buildOverviewDescription(stats, ranks, where);
    case 'ranks':
      return buildRanksDescription(ranks, where);
    case 'repositories':
      return buildRepositoriesDescription(stats);
    case 'languages':
      return buildLanguagesDescription(stats?.sLangs as LanguagesType, scope, where);
  }
}

/** GitHub, the profile's website and its social accounts, as listed in the sidebar. */
function buildSameAs(stats: DataType): string[] {
  const urls = [
    `https://github.com/${stats.login}`,
    ensureLinkProtocol(stats.websiteUrl),
    ...(stats.socialAccounts?.nodes?.map((account) => account.url) ?? []),
  ];

  return [...new Set(urls.filter((url): url is string => !!url && URL.canParse(url)))];
}

function buildPerson(stats: DataType, url: string, avatarUrl: string) {
  return {
    '@type': 'Person',
    name: stats.name || stats.login,
    alternateName: stats.login,
    url,
    image: avatarUrl,
    sameAs: buildSameAs(stats),
  };
}

function buildBreadcrumbs(name: string, base: string, crumb: string | undefined, url: string) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: absoluteUrl('/') },
      { '@type': 'ListItem', position: 2, name, item: base },
      crumb ? { '@type': 'ListItem', position: 3, name: crumb, item: url } : undefined,
    ].filter(Boolean),
  };
}

function buildTabSpecificJsonLd(
  tab: Tab,
  scope: Scope,
  url: string,
  title: string,
  description: string,
  stats: DataType,
  person: ReturnType<typeof buildPerson>,
) {
  switch (tab) {
    case 'overview':
    case 'ranks':
      return {
        '@context': 'https://schema.org',
        '@type': 'ProfilePage',
        url,
        name: title,
        description,
        mainEntity: person,
      };

    case 'repositories':
      return {
        '@context': 'https://schema.org',
        '@type': 'CollectionPage',
        url,
        name: title,
        description,
        about: person,
        mainEntity: {
          '@type': 'ItemList',
          itemListElement: (stats?.repositories ?? []).map((repo, i) => ({
            '@type': 'ListItem',
            position: i + 1,
            name: repo.name,
            url: repo.url,
          })),
        },
      };

    case 'languages': {
      const languages = ((stats.sLangs as LanguagesType) ?? []).filter((l) => l.score);
      const rankOf = (l: NonNullable<LanguagesType>[number]) =>
        scope === 'country' ? l.rankCountry?.s : l.rankGlobal?.s;

      return {
        '@context': 'https://schema.org',
        '@type': 'CollectionPage',
        url,
        name: title,
        description,
        about: person,
        mainEntity: {
          '@type': 'ItemList',
          itemListElement: languages.map((l, i) => ({
            '@type': 'ListItem',
            position: i + 1,
            name: l.name,
            description: rankOf(l) ? `Rank ${rankOf(l)}` : undefined,
          })),
        },
      };
    }
  }
}

/** Metadata for a profile tab and the JSON-LD to render on it. */
export function buildProfileTabSEO(
  tab: Tab,
  data: DataType,
  scope: Scope = 'global',
): { metadata: Metadata; jsonLd: object[] } {
  const { login, name, country } = data;
  const avatarUrl = absoluteUrl(`/api/avatar/${encodeURIComponent(login)}`);
  // Only the overview, ranks and languages tabs have a country variant.
  const where = scope === 'country' && country ? `in ${country}` : '';

  const userName = `${login}${name ? ` (${name})` : ''}`;
  const basePath = `/profile/${encodeURIComponent(login)}`;
  // A user without a country has no country ranking, so the variant's title and description
  // fall back to the global tab's, and it canonicalizes there rather than duplicating it.
  const path = buildPath(tab, basePath, where ? scope : 'global');
  const base = absoluteUrl(basePath);
  const url = absoluteUrl(path);
  const title = `${userName} - ${TAB_TITLES[tab]}${where ? ` ${where}` : ''}`;
  const description =
    buildDescription(tab, data, scope, where) ||
    `${TAB_TITLES[tab]} of ${userName} on GitHub${where ? ` ${where}` : ''}.`;
  const crumb = tab === 'overview' && !where ? undefined : `${TAB_CRUMBS[tab]}${where ? ` ${where}` : ''}`;

  const person = buildPerson(data, base, avatarUrl);
  const jsonLd = [
    buildTabSpecificJsonLd(tab, scope, url, title, description, data, person),
    buildBreadcrumbs(userName, base, crumb, url),
  ];

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
    jsonLd,
  };
}
