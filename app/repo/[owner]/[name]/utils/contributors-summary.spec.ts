import { describe, expect, it } from 'vitest';

import { buildContributorsQuestions, buildContributorsSummary } from './contributors-summary';
import type { SummaryPart } from '@/app/profile/[login]/utils/profile-summary';
import { facts } from '@/components/pulse/pulse.fixtures';

const text = (parts: SummaryPart[]) => parts.map((part) => (typeof part === 'string' ? part : part.text)).join('');

describe('buildContributorsSummary', () => {
  it('says what the board says', () => {
    const parts = buildContributorsSummary('nebula/ui', facts);

    expect(text(parts)).toBe(
      'nebula/ui had 12 active contributors in the last 12 months, 3 of them first-time. They made 96 commits and merged 30 pull requests. The code base has 1,760 lines of code: 965 added and 285 deleted in the last 12 months, 85% code and 15% tests. The most active contributor is octo-dev; most top contributors are in Germany. Updated October 20, 2026.',
    );
    expect(parts).toContainEqual({ text: 'octo-dev', href: '/profile/octo-dev' });
  });

  it('leaves out what it does not have: newcomers, the country, a profile link', () => {
    const quiet = {
      ...facts,
      last12: { ...facts.last12, activeContributors: 1, newContributors: 0, commits: 1, pullRequests: 0 },
      topContributors: [{ ...facts.topContributors[0], hasProfile: false }],
      countries: [],
    };
    const parts = buildContributorsSummary('nebula/ui', quiet);

    expect(text(parts)).toContain(
      'nebula/ui had 1 active contributor in the last 12 months. They made 1 commit and merged 0 pull requests.',
    );
    expect(text(parts)).toContain('The most active contributor is octo-dev. Updated');
    expect(parts.every((part) => typeof part === 'string')).toBe(true);
  });
});

describe('buildContributorsQuestions', () => {
  it('asks who contributes, whether it is maintained and how it is counted, as the board does', () => {
    expect(buildContributorsQuestions('nebula/ui', facts)).toEqual([
      {
        question: 'Who contributes to nebula/ui?',
        answer: '12 people in the last 12 months. octo-dev made the most changes (700 lines added, 40 commits).',
      },
      {
        question: 'Is nebula/ui actively maintained?',
        answer: 'Yes: 96 commits and 30 merged pull requests in the last 12 months, by 12 contributors.',
      },
      {
        question: 'How is this counted?',
        answer: 'People only, bots excluded. A merged pull request counts once, at its merge date.',
      },
    ]);
  });

  it('answers a quiet year from its own numbers', () => {
    const quiet = { ...facts, last12: { ...facts.last12, activeContributors: 0, commits: 0, pullRequests: 0 } };

    expect(buildContributorsQuestions('nebula/ui', quiet).map(({ answer }) => answer)).toEqual([
      'No commits in the last 12 months.',
      'People only, bots excluded. A merged pull request counts once, at its merge date.',
    ]);
  });
});
