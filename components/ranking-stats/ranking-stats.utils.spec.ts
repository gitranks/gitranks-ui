import { describe, expect, it } from 'vitest';

import { buildLanguageRankingStats, buildRankingStats, type StatsPart } from './ranking-stats.utils';
import { RankingTypeClient } from '@/types/ranking.types';

const text = (parts: StatsPart[]) => parts.map((part) => (typeof part === 'string' ? part : part.text)).join('');
const links = (parts: StatsPart[]) => parts.flatMap((part) => (typeof part === 'string' ? [] : [part.href]));

const leaders = [
  { login: 'alice', score: 264651 },
  { login: 'bob', score: 1 },
  { login: 'carol', score: 900 },
  { login: 'dave', score: 800 },
];

describe('buildRankingStats', () => {
  it('states the worldwide count, the entry rule, the top three and the leading languages', () => {
    const parts = buildRankingStats({
      rankingType: RankingTypeClient.Star,
      rankedCount: 1657241,
      leaders,
      languages: { names: ['TypeScript', 'Python', 'Rust'], date: '2026-10-01' },
    });

    expect(text(parts)).toBe(
      'At the latest weekly count, 1,657,241 developers are in the worldwide stars ranking: everyone with 5+ stars on repositories they own. ' +
        'The top three are @alice (264,651 stars), @bob (1 star) and @carol (900 stars). ' +
        'By stars, the leading languages on GitRanks are TypeScript, Python and Rust (summary of October 1, 2026). ' +
        'How rankings work.',
    );
    expect(links(parts)).toEqual([
      '/profile/alice',
      '/profile/bob',
      '/profile/carol',
      '/language/TypeScript/global/1',
      '/language/Python/global/1',
      '/language/Rust/global/1',
      '/methodology',
    ]);
  });

  it('names a country with its article and links its language rankings', () => {
    const parts = buildRankingStats({
      rankingType: RankingTypeClient.Contribution,
      country: 'United States',
      rankedCount: 275264,
      leaders: leaders.slice(0, 2),
      languages: { names: ['C#'], date: '2026-10-01' },
    });

    expect(text(parts)).toContain(
      '275,264 developers are in the contributor ranking for the United States: everyone with 5+ stars in total on other accounts',
    );
    expect(text(parts)).toContain('The top two are @alice (264,651 stars) and @bob (1 star). ');
    expect(text(parts)).toContain('the leading languages among developers in the United States are C# ');
    expect(links(parts)).toContain('/language/C%23/United%20States/1');
  });

  it('counts followers in followers', () => {
    const parts = buildRankingStats({
      rankingType: RankingTypeClient.Follower,
      rankedCount: 1,
      leaders: [{ login: 'alice', score: 7 }],
    });

    expect(text(parts)).toBe(
      'At the latest weekly count, 1 developer is in the worldwide followers ranking: everyone with 5+ followers. ' +
        'The top developer is @alice (7 followers). How rankings work.',
    );
  });

  it('leaves out facts without data, and says nothing when there is none', () => {
    const parts = buildRankingStats({
      rankingType: RankingTypeClient.Star,
      rankedCount: null,
      leaders: [{ login: 'alice', score: null }],
      languages: { names: [], date: '2026-10-01' },
    });

    expect(text(parts)).toBe('The top developer is @alice. How rankings work.');
    expect(buildRankingStats({ rankingType: RankingTypeClient.Star, leaders: [] })).toEqual([]);
  });

  it('encodes logins in profile links', () => {
    const parts = buildRankingStats({ rankingType: RankingTypeClient.Star, leaders: [{ login: 'a-b', score: 5 }] });

    expect(links(parts)).toContain('/profile/a-b');
  });
});

describe('buildLanguageRankingStats', () => {
  it('places the language and counts its developers worldwide', () => {
    const parts = buildLanguageRankingStats({
      language: 'TypeScript',
      summary: { position: 3, usersCount: 123456, date: '2026-10-01' },
      leaders,
    });

    expect(text(parts)).toBe(
      'TypeScript is the #3 language by stars on GitRanks, and one of the top 5 languages of 123,456 developers (summary of October 1, 2026). ' +
        'Developers are ranked by the TypeScript share of the stars on repositories they own. ' +
        'The top three are @alice (264,651 TypeScript stars), @bob (1 TypeScript star) and @carol (900 TypeScript stars). ' +
        'How rankings work.',
    );
  });

  it('scopes the place to a country and skips a missing summary', () => {
    expect(
      text(
        buildLanguageRankingStats({
          language: 'Go',
          country: 'Netherlands',
          summary: { position: 7, usersCount: 1, date: '2026-10-01' },
          leaders: [],
        }),
      ),
    ).toContain(
      'Go is the #7 language by stars among developers in the Netherlands, and one of the top 5 languages of 1 developer there (',
    );

    expect(text(buildLanguageRankingStats({ language: 'Go', summary: null, leaders: [] }))).toBe(
      'Developers are ranked by the Go share of the stars on repositories they own. How rankings work.',
    );
  });
});
