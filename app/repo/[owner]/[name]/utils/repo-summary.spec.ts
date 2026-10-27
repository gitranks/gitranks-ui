import { describe, expect, it } from 'vitest';

import { buildRepoSummary, type RepoSummaryInput } from './repo-summary';
import type { SummaryPart } from '@/app/profile/[login]/utils/profile-summary';

const summaryToText = (parts: SummaryPart[]) =>
  parts.map((part) => (typeof part === 'string' ? part : part.text)).join('');

const input = (overrides: Partial<RepoSummaryInput> = {}): RepoSummaryInput => ({
  owner: 'vercel',
  nameWithOwner: 'vercel/next.js',
  language: 'JavaScript',
  stars: 130_000,
  gainedThisMonth: 1_250,
  createdAt: '2016-10-05T23:32:51.000Z',
  isArchived: false,
  isInOrganization: true,
  rank: { s: 12, sM: 14, l: 3, lM: 3, language: 'JavaScript' },
  rankedCount: 25_000,
  languageCount: 4_000,
  updatedAt: '2026-10-26T00:00:00.000Z',
  ...overrides,
});

const text = (overrides: Partial<RepoSummaryInput> = {}) => summaryToText(buildRepoSummary(input(overrides)));
const links = (overrides: Partial<RepoSummaryInput> = {}) =>
  buildRepoSummary(input(overrides)).filter((part) => typeof part !== 'string');

describe('buildRepoSummary', () => {
  it('states both ranks with their ranked counts, the month, the owner and the dates', () => {
    expect(text()).toBe(
      'vercel/next.js is ranked #12 of 25,000 repositories worldwide by stars (130,000 stars) ' +
        'and #3 of 4,000 in JavaScript. It gained 1,250 stars this month. ' +
        'It belongs to the vercel organization. It was created on October 5, 2016. ' +
        'Star history updated on October 26, 2026.',
    );
  });

  it('links the rankings and the owner page', () => {
    expect(links()).toEqual([
      { text: 'worldwide', href: '/repos/1', title: 'Repository ranking worldwide' },
      { text: 'JavaScript', href: '/repos/language/JavaScript/1', title: 'JavaScript repository ranking' },
      { text: 'vercel', href: '/org/vercel' },
    ]);
  });

  it('leaves out ranked counts it does not have or that are older than the rank', () => {
    expect(text({ rankedCount: undefined, languageCount: 2 })).toMatch(
      /^vercel\/next\.js is ranked #12 worldwide by stars \(130,000 stars\) and #3 in JavaScript\./,
    );
    expect(text({ rankedCount: undefined })).toMatch(/^vercel\/next\.js is ranked #12 worldwide .* and #3 of 4,000 in/);
  });

  it('names the ranking of repositories without a language', () => {
    expect(text({ language: null, rank: { s: 12, l: 3, language: null } })).toMatch(
      /and #3 of 4,000 without a language\./,
    );
    expect(links({ language: null, rank: { s: 12, l: 3, language: null } })[1]).toMatchObject({
      href: '/repos/no-language/1',
    });
  });

  it('names the language when the language rank is in another one', () => {
    expect(text({ language: 'Go', rank: { s: 12, l: 3, language: null } })).toMatch(
      /without a language\. .*Its main language is Go\./,
    );
    expect(text({ language: 'JavaScript', rank: { s: 12, l: 3, language: 'JavaScript' } })).not.toMatch(
      /main language/,
    );
  });

  it('says a repository past the threshold joins the rankings at their next update', () => {
    expect(text({ stars: 100, rank: null })).toMatch(
      /^vercel\/next\.js has 100 stars and is not ranked yet: it joins the rankings at their next update\. /,
    );
  });

  it('says an unranked repository is not ranked yet, and names its language', () => {
    expect(
      text({
        owner: 'octocat',
        nameWithOwner: 'octocat/tiny',
        language: 'Go',
        stars: 42,
        gainedThisMonth: -1,
        isInOrganization: false,
        isArchived: true,
        rank: null,
        updatedAt: null,
      }),
    ).toBe(
      'octocat/tiny has 42 stars and is not ranked: repositories are ranked from 100 stars. ' +
        'It lost 1 star this month. It belongs to octocat. ' +
        'Its main language is Go. It was created on October 5, 2016. It is archived.',
    );
    expect(links({ owner: 'octocat', isInOrganization: false, rank: null })).toEqual([
      { text: 'octocat', href: '/profile/octocat' },
    ]);
  });

  it('leaves out the owner when it is not known to be a user or an organization', () => {
    expect(text({ isInOrganization: null, createdAt: null, gainedThisMonth: 0 })).toBe(
      'vercel/next.js is ranked #12 of 25,000 repositories worldwide by stars (130,000 stars) ' +
        'and #3 of 4,000 in JavaScript. Star history updated on October 26, 2026.',
    );
  });
});
