import type { Route } from 'next';

import { UserRankProp } from '@/types/ranking.types';
import { getLanguageRankingPath } from '@/utils/get-language-ranking-path';
import { getTypeByRankProp } from '@/utils/get-rank-prop-by-ranking-type';

type Ranks = {
  s?: number | null;
  sProvisional?: number | null;
  c?: number | null;
  cProvisional?: number | null;
  f?: number | null;
  fProvisional?: number | null;
} | null;

/** How many profiles a ranking holds, as the tiers report it. */
export type RankedCounts = { sUsers?: number | null; cUsers?: number | null; fUsers?: number | null } | null;

export type SummaryPart = string | { text: string; href: Route };

export type ProfileSummaryInput = {
  login: string;
  name?: string | null;
  country?: string | null;
  scores: { s?: number | null; c?: number | null; f?: number | null };
  rankGlobal?: Ranks;
  rankCountry?: Ranks;
  rankedGlobal?: RankedCounts;
  rankedCountry?: RankedCounts;
  repositories?: { name?: string | null; stargazerCount?: number | null }[] | null;
  languages?: { name: string; score?: number | null }[] | null;
  updatedAt?: unknown;
};

const RANKING_ORDER = [UserRankProp.s, UserRankProp.c, UserRankProp.f] as const;

const CRITERIA: Record<UserRankProp, { by: string; unit: string }> = {
  [UserRankProp.s]: { by: 'by stars on their own repositories', unit: 'stars' },
  [UserRankProp.c]: { by: 'by stars on repositories they contributed to', unit: 'stars' },
  [UserRankProp.f]: { by: 'by followers', unit: 'followers' },
};

const DATE_FORMAT = new Intl.DateTimeFormat('en-US', { dateStyle: 'long', timeZone: 'UTC' });

const formatNumber = (n: number) => n.toLocaleString('en-US');

/** The rank shown on the profile: the ranked position, or the provisional one a new profile gets first. */
export const rankOf = (ranks: Ranks | undefined, prop: UserRankProp): number | undefined => {
  const rank = ranks?.[prop] ?? ranks?.[`${prop}Provisional`];

  return rank && rank > 0 ? rank : undefined;
};

/** "the United States", "the Netherlands", "Germany". */
export const countryInSentence = (country: string) =>
  /^(United |Republic of )|( Islands| Republic)$|^(Netherlands|Caribbean Netherlands|Philippines|Bahamas|Gambia|Maldives|Comoros|Seychelles|British Indian Ocean Territory)$/.test(
    country,
  )
    ? `the ${country}`
    : country;

const joinList = (items: SummaryPart[]): SummaryPart[] =>
  items.flatMap((item, i) => {
    if (i === 0) {
      return [item];
    }

    return [i === items.length - 1 ? ' and ' : ', ', item];
  });

/** "#12 of 1,000": the count is left out when it is missing or older than the rank. */
const position = (rank: number, ranked?: number | null, noun = '') =>
  `#${formatNumber(rank)}${ranked && ranked >= rank ? ` of ${formatNumber(ranked)}${noun}` : ''}`;

const countryLink = (country: string, prop: UserRankProp): SummaryPart[] => {
  const article = countryInSentence(country).startsWith('the ') ? 'the ' : '';

  return [
    article,
    { text: country, href: `/country/${encodeURIComponent(country)}/${getTypeByRankProp(prop)}/1` as Route },
  ];
};

function rankingSentence(input: ProfileSummaryInput, prop: UserRankProp, subject: string): SummaryPart[] | null {
  const { country, scores, rankGlobal, rankCountry, rankedGlobal, rankedCountry } = input;
  const globalRank = rankOf(rankGlobal, prop);
  const countryRank = country ? rankOf(rankCountry, prop) : undefined;

  if (!globalRank && !countryRank) {
    return null;
  }

  const { by, unit } = CRITERIA[prop];
  const score = scores[prop];
  const criterion = `${by}${score ? ` (${formatNumber(score)} ${unit})` : ''}`;
  const verb = subject === 'They' ? 'are' : 'is';
  const parts: SummaryPart[] = [`${subject} ${verb} ranked `];

  if (globalRank) {
    parts.push(`${position(globalRank, rankedGlobal?.[`${prop}Users`], ' developers')} `, {
      text: 'worldwide',
      href: `/by/${getTypeByRankProp(prop)}/1` as Route,
    });
    parts.push(` ${criterion}`);

    if (countryRank && country) {
      parts.push(` and ${position(countryRank, rankedCountry?.[`${prop}Users`])} in `, ...countryLink(country, prop));
    }
  } else if (countryRank && country) {
    parts.push(`${position(countryRank, rankedCountry?.[`${prop}Users`], ' developers')} in `);
    parts.push(...countryLink(country, prop), ` ${criterion}`);
  }

  parts.push('.');

  return parts;
}

function topRepositorySentence(repositories: ProfileSummaryInput['repositories']): SummaryPart[] | null {
  const top = repositories
    ?.filter((repo) => repo.name && (repo.stargazerCount ?? 0) > 0)
    .reduce<NonNullable<ProfileSummaryInput['repositories']>[number] | undefined>(
      (best, repo) => (!best || (repo.stargazerCount ?? 0) > (best.stargazerCount ?? 0) ? repo : best),
      undefined,
    );

  if (!top?.stargazerCount) {
    return null;
  }

  return [`Their most-starred repository is ${top.name} (${formatNumber(top.stargazerCount)} stars).`];
}

function languagesSentence(languages: ProfileSummaryInput['languages']): SummaryPart[] | null {
  const top = (languages ?? [])
    .filter((language) => language.name && (language.score ?? 0) > 0)
    .toSorted((a, b) => (b.score ?? 0) - (a.score ?? 0))
    .slice(0, 3);

  if (!top.length) {
    return null;
  }

  const links = top.map(({ name }) => ({ text: name, href: getLanguageRankingPath(name, 'global') }));

  return [
    top.length === 1 ? 'Their main language by stars is ' : 'Their main languages by stars are ',
    ...joinList(links),
    '.',
  ];
}

function updatedSentence(updatedAt: unknown): SummaryPart[] | null {
  if (typeof updatedAt !== 'string' && typeof updatedAt !== 'number' && !(updatedAt instanceof Date)) {
    return null;
  }

  const date = new Date(updatedAt);

  return Number.isNaN(date.getTime()) ? null : [`Profile data updated on ${DATE_FORMAT.format(date)}.`];
}

/**
 * A plain-language summary of a profile, from the data the overview page already has. Facts without
 * data are left out. Country and language names link to their rankings.
 */
export function buildProfileSummary(input: ProfileSummaryInput): SummaryPart[] {
  const { login, name } = input;
  const displayName = name && name !== login ? `${name} (@${login})` : `@${login}`;

  const rankings = RANKING_ORDER.reduce<SummaryPart[][]>((sentences, prop) => {
    const sentence = rankingSentence(input, prop, sentences.length ? 'They' : displayName);

    return sentence ? [...sentences, sentence] : sentences;
  }, []);

  const sentences = [
    ...(rankings.length ? rankings : [[`${displayName} is not ranked yet.`]]),
    topRepositorySentence(input.repositories),
    languagesSentence(input.languages),
    updatedSentence(input.updatedAt),
  ].filter((sentence): sentence is SummaryPart[] => !!sentence);

  return sentences.flatMap((sentence, i) => (i === 0 ? sentence : [' ', ...sentence]));
}

/** The summary as plain text, e.g. for a description. */
export const summaryToText = (parts: SummaryPart[]) =>
  parts.map((part) => (typeof part === 'string' ? part : part.text)).join('');
