import { REPO_MIN_RANK_STARS } from '@/app/app.consts';
import type { SummaryPart } from '@/app/profile/[login]/utils/profile-summary';
import type { PageRepoQuery } from '@/types/generated/graphql';
import { getRepoLanguageRankingPath, getRepoOwnerPath, getRepoRankingPath } from '@/utils/repo-paths';

type Repo = NonNullable<PageRepoQuery['repo']>;

export type RepoSummaryInput = Pick<
  Repo,
  'owner' | 'nameWithOwner' | 'language' | 'stars' | 'gainedThisMonth' | 'createdAt' | 'isArchived' | 'isInOrganization'
> & {
  /** The rank shown on the page: `null` while the repository is not ranked. */
  rank?: Repo['rank'];
  /** How many repositories are ranked, and how many in the repository's language. */
  rankedCount?: number;
  languageCount?: number;
  /** When the star history was last read. */
  updatedAt?: unknown;
};

const DATE_FORMAT = new Intl.DateTimeFormat('en-US', { dateStyle: 'long', timeZone: 'UTC' });

const formatNumber = (n: number) => n.toLocaleString('en-US');

const formatDate = (value: unknown) => {
  if (typeof value !== 'string' && typeof value !== 'number' && !(value instanceof Date)) {
    return undefined;
  }

  const date = new Date(value);

  return Number.isNaN(date.getTime()) ? undefined : DATE_FORMAT.format(date);
};

/** "#12 of 1,000 repositories"; the count is left out when it is missing or smaller than the rank. */
const position = (rank: number, ranked?: number, noun = '') =>
  `#${formatNumber(rank)}${ranked && ranked >= rank ? ` of ${formatNumber(ranked)}${noun}` : ''}`;

function rankSentence({ nameWithOwner, rank, stars, rankedCount, languageCount }: RepoSummaryInput): SummaryPart[] {
  if (!rank?.s) {
    return [
      stars >= REPO_MIN_RANK_STARS
        ? `${nameWithOwner} has ${formatNumber(stars)} stars and is not ranked yet: it joins the rankings at their next update.`
        : `${nameWithOwner} has ${formatNumber(stars)} ${stars === 1 ? 'star' : 'stars'} and is not ranked: repositories are ranked from ${formatNumber(REPO_MIN_RANK_STARS)} stars.`,
    ];
  }

  const parts: SummaryPart[] = [
    `${nameWithOwner} is ranked ${position(rank.s, rankedCount, ' repositories')} `,
    { text: 'worldwide', href: getRepoRankingPath(), title: 'Repository ranking worldwide' },
    ` by stars (${formatNumber(stars)} stars)`,
  ];

  if (rank.l) {
    const languageRanking = getRepoLanguageRankingPath(rank.language);
    parts.push(
      ` and ${position(rank.l, languageCount)} `,
      ...(rank.language
        ? ['in ', { text: rank.language, href: languageRanking, title: `${rank.language} repository ranking` }]
        : [{ text: 'without a language', href: languageRanking, title: 'Ranking of repositories without a language' }]),
    );
  }

  parts.push('.');

  return parts;
}

function gainedSentence(gainedThisMonth?: number | null): SummaryPart[] | null {
  if (!gainedThisMonth) {
    return null;
  }

  const count = Math.abs(gainedThisMonth);

  return [
    `It ${gainedThisMonth > 0 ? 'gained' : 'lost'} ${formatNumber(count)} ${count === 1 ? 'star' : 'stars'} this month.`,
  ];
}

function ownerSentence({ owner, isInOrganization }: RepoSummaryInput): SummaryPart[] | null {
  const href = getRepoOwnerPath(owner, isInOrganization);

  if (!href) {
    return null;
  }

  return isInOrganization
    ? ['It belongs to the ', { text: owner, href }, ' organization.']
    : ['It belongs to ', { text: owner, href }, '.'];
}

function aboutSentences({ language, rank, createdAt, isArchived }: RepoSummaryInput): SummaryPart[][] {
  const created = formatDate(createdAt);

  return [
    // A language rank in the repository's language names it already.
    language && !(rank?.l && rank.language === language) ? [`Its main language is ${language}.`] : null,
    created ? [`It was created on ${created}.`] : null,
    isArchived ? ['It is archived.'] : null,
  ].filter((sentence): sentence is string[] => !!sentence);
}

function updatedSentence(updatedAt: unknown): SummaryPart[] | null {
  const date = formatDate(updatedAt);

  return date ? [`Star history updated on ${date}.`] : null;
}

/**
 * A plain-language summary of a repository, from the data the page already has. Facts without data are
 * left out. The rankings and the owner link to their pages.
 */
export function buildRepoSummary(input: RepoSummaryInput): SummaryPart[] {
  const sentences = [
    rankSentence(input),
    gainedSentence(input.gainedThisMonth),
    ownerSentence(input),
    ...aboutSentences(input),
    updatedSentence(input.updatedAt),
  ].filter((sentence): sentence is SummaryPart[] => !!sentence);

  return sentences.flatMap((sentence, i) => (i === 0 ? sentence : [' ', ...sentence]));
}
