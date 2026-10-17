import { describe, expect, it } from 'vitest';

import { buildProfileSummary, countryInSentence, type ProfileSummaryInput, type SummaryPart } from './profile-summary';

const summaryToText = (parts: SummaryPart[]) =>
  parts.map((part) => (typeof part === 'string' ? part : part.text)).join('');

const input = (overrides: Partial<ProfileSummaryInput> = {}): ProfileSummaryInput => ({
  login: 'octocat',
  name: 'Octo Cat',
  country: 'United States',
  scores: { s: 150000, c: 4000, f: 90000 },
  rankGlobal: { s: 12, c: 300, f: 5 },
  rankCountry: { s: 1, c: 30, f: 2 },
  rankedGlobal: { sUsers: 1000000, cUsers: 900000, fUsers: 800000 },
  rankedCountry: { sUsers: 250000, cUsers: 200000, fUsers: 150000 },
  repositories: [
    { name: 'micro', stargazerCount: 12000 },
    { name: 'nano', stargazerCount: 40000 },
  ],
  languages: [
    { name: 'C++', score: 3000 },
    { name: 'Python', score: 120000 },
  ],
  updatedAt: '2026-10-16T08:00:00Z',
  ...overrides,
});

const text = (overrides: Partial<ProfileSummaryInput> = {}) => summaryToText(buildProfileSummary(input(overrides)));
const links = (overrides: Partial<ProfileSummaryInput> = {}) =>
  buildProfileSummary(input(overrides)).filter((part) => typeof part !== 'string');

describe('buildProfileSummary', () => {
  it('states every rank with its ranking, scope and ranked count', () => {
    expect(text()).toBe(
      'Octo Cat (@octocat) is ranked #12 of 1,000,000 developers worldwide by stars on their own repositories ' +
        '(150,000 stars) and #1 of 250,000 in the United States. ' +
        'They are ranked #300 of 900,000 developers worldwide by stars on repositories they contributed to ' +
        '(4,000 stars) and #30 of 200,000 in the United States. ' +
        'They are ranked #5 of 800,000 developers worldwide by followers (90,000 followers) ' +
        'and #2 of 150,000 in the United States. ' +
        'Their most-starred repository is nano (40,000 stars). ' +
        'Their main languages by stars are Python and C++. ' +
        'Profile data updated on October 16, 2026.',
    );
  });

  it('links the scopes to the matching leaderboards and the languages to theirs', () => {
    expect(links()).toEqual([
      { text: 'worldwide', href: '/by/stars/1', title: 'Stars Rank worldwide' },
      { text: 'United States', href: '/country/United%20States/stars/1', title: 'Stars Rank in the United States' },
      { text: 'worldwide', href: '/by/contributions/1', title: 'Contributor Rank worldwide' },
      {
        text: 'United States',
        href: '/country/United%20States/contributions/1',
        title: 'Contributor Rank in the United States',
      },
      { text: 'worldwide', href: '/by/followers/1', title: 'Followers Rank worldwide' },
      {
        text: 'United States',
        href: '/country/United%20States/followers/1',
        title: 'Followers Rank in the United States',
      },
      { text: 'Python', href: '/language/Python/global/1' },
      { text: 'C++', href: '/language/C%2B%2B/global/1' },
    ]);
  });

  it('leaves out the rankings, counts and facts it has no data for', () => {
    expect(
      text({
        name: null,
        country: null,
        scores: { s: 0, c: 0, f: 7 },
        rankGlobal: { f: 700000 },
        rankCountry: null,
        rankedGlobal: null,
        repositories: [],
        languages: [{ name: 'Go', score: 0 }],
        updatedAt: null,
      }),
    ).toBe('@octocat is ranked #700,000 worldwide by followers (7 followers).');
  });

  it('drops a ranked count that is older than the rank', () => {
    expect(text({ rankGlobal: { s: 1200 }, rankedGlobal: { sUsers: 1100 }, rankCountry: null })).toContain(
      'is ranked #1,200 worldwide by stars',
    );
  });

  it('marks a provisional rank as such and gives no ranked count for it', () => {
    expect(text({ rankGlobal: { sProvisional: 42 }, rankCountry: { s: 3, cProvisional: 7 } })).toContain(
      'is ranked #42 (provisional) worldwide by stars on their own repositories (150,000 stars) and #3 of 250,000 in the United States.',
    );
    expect(text({ rankGlobal: { s: 40, sProvisional: 42 } })).toContain('is ranked #40 of 1,000,000 developers');
    expect(text({ rankGlobal: null, rankCountry: { cProvisional: 7 } })).toContain(
      'is ranked #7 (provisional) in the United States by stars on repositories they contributed to',
    );
  });

  it('ignores a blank name', () => {
    expect(text({ name: '   ' })).toMatch(/^@octocat is ranked/);
  });

  it('starts from the country rank when there is no worldwide rank', () => {
    expect(text({ country: 'Germany', rankGlobal: null, rankCountry: { s: 3 } })).toMatch(
      /^Octo Cat \(@octocat\) is ranked #3 of 250,000 developers in Germany by stars on their own repositories \(150,000 stars\)\./,
    );
  });

  it('ignores a country rank when the profile has no country', () => {
    expect(text({ country: null, rankGlobal: { s: 12 } })).toMatch(
      /^Octo Cat \(@octocat\) is ranked #12 of 1,000,000 developers worldwide by stars on their own repositories \(150,000 stars\)\. Their/,
    );
  });

  it('says so when the profile is not ranked, and still lists the rest', () => {
    expect(text({ rankGlobal: null, rankCountry: null, name: 'octocat' })).toBe(
      '@octocat is not ranked yet. Their most-starred repository is nano (40,000 stars). ' +
        'Their main languages by stars are Python and C++. Profile data updated on October 16, 2026.',
    );
  });

  it('names a single language in the singular and at most three', () => {
    expect(text({ languages: [{ name: 'Rust', score: 1 }] })).toContain('Their main language by stars is Rust.');
    expect(
      text({
        languages: [
          { name: 'A', score: 4 },
          { name: 'B', score: 3 },
          { name: 'C', score: 2 },
          { name: 'D', score: 1 },
        ],
      }),
    ).toContain('Their main languages by stars are A, B and C.');
  });

  it('skips a date it cannot read', () => {
    expect(text({ updatedAt: 'not a date' })).not.toContain('Profile data updated');
  });
});

describe('countryInSentence', () => {
  it.each([
    ['United States', 'the United States'],
    ['United Kingdom', 'the United Kingdom'],
    ['Netherlands', 'the Netherlands'],
    ['Philippines', 'the Philippines'],
    ['Czech Republic', 'the Czech Republic'],
    ['Cayman Islands', 'the Cayman Islands'],
    ['Democratic Republic of the Congo', 'the Democratic Republic of the Congo'],
    ['Germany', 'Germany'],
    ['Isle of Man', 'Isle of Man'],
  ])('%s → %s', (country, expected) => {
    expect(countryInSentence(country)).toBe(expected);
  });
});
