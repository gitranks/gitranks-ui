import type { PulseFactsData, PulseSeriesData } from './pulse.utils';
import { OrgPulseCountryGroup } from '@/types/generated/graphql';

/** Three months, two labels; `[label][month]` like the API. */
export const series: PulseSeriesData = {
  months: ['2026-07', '2026-08', '2026-09'],
  labels: ['Code', 'Tests'],
  snapshot: [
    [1000, 1100, 1500],
    [200, 210, 260],
  ],
  added: [
    [120, 150, 600],
    [20, 15, 60],
  ],
  deleted: [
    [20, 50, 200],
    [0, 5, 10],
  ],
  largestChange: [40, 30, 500],
  largestChangeShare: [0.2, 0.136, 0.574],
  crossLines: [0, 0, 1200],
  commits: [30, 25, 41],
  pullRequests: [10, 8, 12],
  activeLinked: [5, 4, 7],
  activeAnonymous: [1, 0, 2],
  newContributors: [null, null, 3],
};

export const facts: PulseFactsData = {
  lastMonth: '2026-09',
  snapshot: [
    { label: 'Code', lines: 1500, share: 0.852 },
    { label: 'Tests', lines: 260, share: 0.148 },
  ],
  last12: {
    added: 965,
    deleted: 285,
    net: 680,
    commits: 96,
    pullRequests: 30,
    activeContributors: 12,
    newContributors: 3,
  },
  topContributors: [
    {
      githubId: '1',
      login: 'octo-dev',
      hasProfile: true,
      avatarUrl: 'https://avatars.githubusercontent.com/u/1?v=4',
      linesAdded: 700,
      linesDeleted: 200,
      commits: 40,
      pullRequests: 12,
      activeMonths: 3,
      topLabels: ['TypeScript', 'CSS'],
    },
    {
      githubId: '2',
      login: 'second-dev',
      hasProfile: false,
      avatarUrl: 'https://avatars.githubusercontent.com/u/2',
      linesAdded: 100,
      linesDeleted: 50,
      commits: 9,
      pullRequests: 3,
      activeMonths: 2,
      topLabels: [],
    },
    {
      githubId: '3',
      login: '',
      hasProfile: false,
      avatarUrl: 'https://avatars.githubusercontent.com/u/3',
      linesAdded: 10,
      linesDeleted: 5,
      commits: 2,
      pullRequests: 1,
      activeMonths: 1,
      topLabels: [],
    },
  ],
  unlinkedAuthors12: 4,
  countries: [
    { group: OrgPulseCountryGroup.Country, country: 'Germany', flag: '🇩🇪', contributors: 5 },
    { group: OrgPulseCountryGroup.NoLocation, country: null, flag: null, contributors: 3 },
    { group: OrgPulseCountryGroup.NotOnGitranks, country: null, flag: null, contributors: 2 },
  ],
  scopeNote:
    "Lines in files under 100 KB in today's 3 public repositories with 5+ stars (archived included, forks excluded), 2021-10 to 2026-09. Files over 100 KB (1.2%), binary files (0.4%), vendored, generated and lock files are not counted.",
  computedAt: '2026-10-20T03:00:00.000Z',
};
