import type { Route } from 'next';

import { MIN_VALUE } from '@/app/app.consts';
import { RankingTypeClient } from '@/types/ranking.types';
import { countryInSentence } from '@/utils/country-in-sentence';
import { formatSummaryDate } from '@/utils/format-summary-date';
import { getLanguageRankingPath } from '@/utils/get-language-ranking-path';

/** Text, or a link. */
export type StatsPart = string | { text: string; href: Route };

/** A profile at the top of the ranking, with its score in that ranking. */
export type RankingLeader = { login: string; score?: number | null };

/** Leading languages by stars, from a monthly summary. */
export type LanguageSummaryFacts = { names: string[]; date: string };

const RANKINGS: Record<RankingTypeClient, { name: string; entry: string; unit: [string, string] }> = {
  [RankingTypeClient.Star]: {
    name: 'stars ranking',
    entry: `${MIN_VALUE}+ stars on repositories the developer owns`,
    unit: ['star', 'stars'],
  },
  [RankingTypeClient.Contribution]: {
    name: 'contributor ranking',
    entry: `${MIN_VALUE}+ stars in total on other accounts' repositories the developer has merged pull requests into`,
    unit: ['star', 'stars'],
  },
  [RankingTypeClient.Follower]: {
    name: 'followers ranking',
    entry: `${MIN_VALUE}+ followers`,
    unit: ['follower', 'followers'],
  },
};

const METHODOLOGY: StatsPart = { text: 'How rankings work', href: '/methodology' };

const formatNumber = (n: number) => n.toLocaleString('en-US');

const count = (n: number, [one, many]: [string, string]) => `${formatNumber(n)} ${n === 1 ? one : many}`;

const joinList = (items: StatsPart[][]): StatsPart[] =>
  items.flatMap((item, i) => (i === 0 ? item : [i === items.length - 1 ? ' and ' : ', ', ...item]));

/** "The top three are @a (10 stars), @b (8 stars) and @c (5 stars). " */
const leadersSentence = (leaders: RankingLeader[], unit: [string, string]): StatsPart[] => {
  const top = leaders.slice(0, 3);

  if (!top.length) {
    return [];
  }

  const lead = top.length === 1 ? 'The top developer is ' : `The top ${top.length === 2 ? 'two' : 'three'} are `;

  return [
    lead,
    ...joinList(
      top.map(({ login, score }) => [
        { text: `@${login}`, href: `/profile/${encodeURIComponent(login)}` as Route },
        ...(score ? [` (${count(score, unit)})`] : []),
      ]),
    ),
    '. ',
  ];
};

type RankingStatsInput = {
  rankingType: RankingTypeClient;
  /** The country the ranking is limited to; worldwide when unset. */
  country?: string;
  /** Profiles in the ranking, from the weekly tier count. */
  rankedCount?: number | null;
  leaders: RankingLeader[];
  languages?: LanguageSummaryFacts | null;
};

/**
 * Page-one facts for a stars, contributor or followers ranking, as sentences a reader can quote.
 * Facts without data are left out.
 */
export function buildRankingStats({
  rankingType,
  country,
  rankedCount,
  leaders,
  languages,
}: RankingStatsInput): StatsPart[] {
  const { name, entry, unit } = RANKINGS[rankingType];
  const parts: StatsPart[] = [];

  if (rankedCount) {
    const ranking = country ? `the ${name} for ${countryInSentence(country)}` : `the worldwide ${name}`;
    parts.push(
      `At the latest weekly count, ${count(rankedCount, ['developer is', 'developers are'])} in ${ranking}. Entry takes ${entry}. `,
    );
  }

  parts.push(...leadersSentence(leaders, unit));

  if (languages?.names.length) {
    const where = country ? `among developers in ${countryInSentence(country)}` : 'on GitRanks';
    parts.push(
      `By stars, the leading languages ${where} are `,
      ...joinList(
        languages.names.map((language) => [
          { text: language, href: getLanguageRankingPath(language, country ?? 'global') },
        ]),
      ),
      ` (summary of ${formatSummaryDate(languages.date)}). `,
    );
  }

  return parts.length ? [...parts, METHODOLOGY, '.'] : [];
}

type LanguageRankingStatsInput = {
  language: string;
  /** The country the ranking is limited to; worldwide when unset. */
  country?: string;
  /** The language's place among all languages by stars, and how many developers have it in their top 5, from the monthly summary. */
  summary?: { position: number; usersCount: number; date: string } | null;
  leaders: RankingLeader[];
};

/** Page-one facts for a language ranking, worldwide or in one country. Facts without data are left out. */
export function buildLanguageRankingStats({
  language,
  country,
  summary,
  leaders,
}: LanguageRankingStatsInput): StatsPart[] {
  const parts: StatsPart[] = [];

  if (summary) {
    const where = country ? `among developers in ${countryInSentence(country)}` : 'on GitRanks';
    parts.push(
      `${language} is the #${formatNumber(summary.position)} language by stars ${where}, and one of the top 5 languages of ${count(summary.usersCount, ['developer', 'developers'])}${country ? ' there' : ''} (summary of ${formatSummaryDate(summary.date)}). `,
    );
  }

  parts.push(
    `Developers who have ${language} among their top 5 languages are ranked by its share of the stars on repositories they own. `,
    ...leadersSentence(leaders, [`${language} star`, `${language} stars`]),
    METHODOLOGY,
    '.',
  );

  return parts;
}
