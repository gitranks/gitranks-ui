import type { LandingData } from '../landing-screen';
import type { RankCardData } from '../rank-card.types';
import { readmeContent } from '../readme-badges';
import type { ReadmeShowcase } from '../readme-showcase';
import { NOW, orgBig, repoBig, userBig } from '@/badge/v3/fixtures';
import { facts as pulseFacts } from '@/components/pulse/pulse.fixtures';
import { countries, globalRankings } from '@/components/ranking-table/__fixtures__/global-rankings';
import { InsightCategory, type InsightsQuery, type RepoRankingsQuery, SegmentType } from '@/types/generated/graphql';

type RepoRow = RepoRankingsQuery['repoRankings'][number];

/** A ranked repository at position `s`, with its stars this month and last month's position. */
export const repoRow = (
  s: number,
  gainedThisMonth: number | null,
  sM: number | null = s,
  [owner, name] = [`owner-${s}`, `repo-${s}`],
): RepoRow => ({
  githubId: `R_${s}`,
  s,
  sM,
  repo: {
    githubId: `R_${s}`,
    owner,
    name,
    nameWithOwner: `${owner}/${name}`,
    ownerAvatarUrl: `https://avatars.githubusercontent.com/u/${s}?v=4`,
    stars: 100_000 - s,
    gainedThisMonth,
  },
});

/** The README mock's content: today's #1 developer, repository and organization from the badge fixtures. */
export const showcase: ReadmeShowcase = {
  user: readmeContent(userBig, 'find', NOW),
  repo: readmeContent(repoBig, 'find', NOW),
  org: readmeContent(orgBig, 'find', NOW),
};

const text = (value: string) => ({ type: SegmentType.Text, text: value, entityKey: null, display: null });
const mention = (key: string, value: string) => ({
  type: SegmentType.Mention,
  text: value,
  entityKey: key,
  display: null,
});

const insight = (
  id: string,
  category: InsightCategory,
  createdAt: string,
  segments: InsightsQuery['insights'][number]['segments'],
  mentions: Record<string, { github: string }> = {},
): InsightsQuery['insights'][number] => ({
  id,
  category,
  createdAt,
  segments,
  entities: { mentions, links: {} },
  replies: [],
  socialPosts: null,
});

/** The newest posts, newest first. */
export const insights: InsightsQuery['insights'] = [
  insight(
    'post-3',
    InsightCategory.Top_100Climber,
    '2026-10-27T09:00:00.000Z',
    [text('🚀 '), mention('m1', 'ivy-js'), text(' climbed 41 places into the top 100 by stars this month, to #58.')],
    { m1: { github: 'ivy-js' } },
  ),
  insight('post-2', InsightCategory.MonthInNumbers, '2026-10-24T09:00:00.000Z', [
    text('October in numbers: 1.66M developers ranked by stars, 18,240 new this month. Rust gained the most.'),
  ]),
  insight(
    'post-1',
    InsightCategory.ScoreMilestone,
    '2026-10-21T09:00:00.000Z',
    [text('⭐ '), mention('m1', 'ana-dev'), text(' passed 250,000 stars on their own repositories.')],
    { m1: { github: 'ana-dev' } },
  ),
];

/** Seven tiers of five levels over `users` positions, best first, as the API cuts them. */
const tiersOf = (users: number) =>
  Array.from({ length: 35 }, (_, index) => ({
    tier: 7 - Math.floor(index / 5),
    level: 5 - (index % 5),
    minRank: Math.round((index * users) / 35) + 1,
    maxRank: Math.round(((index + 1) * users) / 35),
    minValue: Math.round(200_000 / (1 + index * 2)),
  }));

const tiers: LandingData['tiers'] = {
  sUsers: 1_657_241,
  cUsers: 1_101_747,
  fUsers: 3_303_658,
  sTiers: tiersOf(1_657_241),
  cTiers: tiersOf(1_101_747),
  fTiers: tiersOf(3_303_658),
};

const ORGS = ['nebula', 'quill-db', 'fern-lang', 'orbit-ui', 'tidal-labs'];

const orgs: LandingData['orgs'] = ORGS.map((login, index) => ({
  githubId: `O_${index + 1}`,
  s: index + 1,
  sM: [1, 3, 2, 4, 9][index],
  organization: {
    login,
    name: null,
    avatarUrl: `https://avatars.githubusercontent.com/u/org${index + 1}?v=4`,
    location: null,
    country: ['United States', 'Germany', null, 'Japan', 'Ukraine'][index],
    isVerified: true,
    s: Math.round(1_250_000 / (1 + index * 0.6)),
    // fern-lang: 18,000 of its stars, on one repository, came from suspected fake accounts.
    starsNotCounted: login === 'fern-lang' ? { stars: 18_000, repositories: 1 } : null,
  },
}));

/** The organization whose code facts the landing shows, with a year of activity. */
export const featuredOrg: NonNullable<LandingData['featured']> = {
  githubId: 'O_1',
  login: 'nebula',
  name: 'Nebula',
  avatarUrl: 'https://avatars.githubusercontent.com/u/org1?v=4',
  updatedAt: '2026-10-20T03:00:00.000Z',
  hasActivity: true,
  topRepos: [],
  pulse: {
    ...pulseFacts,
    snapshot: [
      { label: 'TypeScript', lines: 412_000, share: 0.512 },
      { label: 'Rust', lines: 160_900, share: 0.2 },
      { label: 'Tests', lines: 96_500, share: 0.12 },
      { label: 'CSS', lines: 56_300, share: 0.07 },
      { label: 'Markdown', lines: 40_200, share: 0.05 },
      { label: 'JSON', lines: 38_600, share: 0.048 },
    ],
    last12: {
      added: 1_840_000,
      deleted: 1_212_000,
      net: 628_000,
      commits: 18_420,
      pullRequests: 6_310,
      activeContributors: 2_104,
      newContributors: 318,
    },
    sharedContributorOrgs: [],
  },
};

const COUNTRY_SUMMARIES = [
  ['United States', 'US', '🇺🇸', 412_000, 41_200_000],
  ['China', 'CN', '🇨🇳', 301_000, 22_400_000],
  ['India', 'IN', '🇮🇳', 288_000, 9_100_000],
  ['Germany', 'DE', '🇩🇪', 96_000, 8_300_000],
  ['Ukraine', 'UA', '🇺🇦', 31_000, 2_900_000],
] as const;

const countrySummaries: LandingData['countries'] = COUNTRY_SUMMARIES.map(([country, code, flag, usersCount, s]) => ({
  country,
  usersCount,
  date: '2026-10-01',
  s,
  c: Math.round(s / 4),
  f: Math.round(s / 3),
  topUsers: null,
  countryData: { code, name: country, flag },
}));

const LANGUAGES = [
  ['TypeScript', '#3178c6', 610_000, 38_100_000],
  ['Python', '#3572A5', 702_000, 34_900_000],
  ['JavaScript', '#f1e05a', 812_000, 31_200_000],
  ['Go', '#00ADD8', 190_000, 12_400_000],
  ['Rust', '#dea584', 140_000, 11_800_000],
  ['Java', '#b07219', 420_000, 9_700_000],
  ['C++', '#f34b7d', 230_000, 8_900_000],
  ['C#', '#178600', 210_000, 5_200_000],
] as const;

const languageSummaries: LandingData['languages'] = LANGUAGES.map(([language, color, usersCount, score]) => ({
  language,
  date: '2026-10-01',
  usersCount,
  score,
  size: score * 10,
  topUser: null,
  languageData: { color },
}));

const RISING = [1_200, 340, 2_900, 80, 15_400, 610, 4_100, 25, 990, 3_300];
const REPO_OWNERS = ['nebula', 'quill-db', 'fern-lang', 'orbit-ui', 'tidal-labs', 'acme'];
const REPO_NAMES = ['ui', 'core', 'cli', 'docs', 'sdk'];
/** The first page of the repository ranking: 30 made-up repositories. */
const repos = Array.from({ length: 30 }, (_, index) =>
  repoRow(index + 1, RISING[index % RISING.length], index + 2, [
    REPO_OWNERS[index % REPO_OWNERS.length],
    REPO_NAMES[Math.floor(index / REPO_OWNERS.length)],
  ]),
);

/** Everything the landing reads, for every visitor. */
export const landingData: LandingData = {
  insights,
  leaderboards: { s: globalRankings('s', 0, 10), c: globalRankings('c', 0, 10), f: globalRankings('f', 0, 10) },
  tiers,
  orgs,
  featured: featuredOrg,
  countries: countrySummaries,
  languages: languageSummaries,
  countryList: countries,
  repos,
  showcase,
};

/** The signed-in viewer's own card, as `/api/me/rank-card` returns it. */
export const viewerRankCard: RankCardData = {
  login: 'octocat',
  name: 'Octo Cat',
  avatarUrl: 'https://avatars.githubusercontent.com/u/viewer?v=4',
  location: 'Lviv, Ukraine',
  flag: '🇺🇦',
  rankings: {
    s: {
      position: 41_204,
      previous: 41_516,
      value: 640,
      rankedCount: 1_657_241,
      tier: { tier: 5, level: 2 },
    },
    c: { position: 8_210, previous: 8_206, value: 410, rankedCount: 1_101_747, tier: { tier: 6, level: 1 } },
    f: { position: null, previous: null, value: 12, rankedCount: 3_303_658, tier: null },
  },
};
