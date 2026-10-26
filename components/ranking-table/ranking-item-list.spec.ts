import { describe, expect, it } from 'vitest';

import { buildRepoRankingItemList } from './ranking-item-list';
import type { RepoRankingsQuery } from '@/types/generated/graphql';

type Rows = RepoRankingsQuery['repoRankings'];

const row = (nameWithOwner: string | null, s: number | null, l: number | null = null): Rows[number] => ({
  githubId: nameWithOwner ?? 'gone',
  s,
  l,
  repo: nameWithOwner ? { githubId: nameWithOwner, owner: '', name: '', nameWithOwner, stars: 100 } : null,
});

const positions = (list: ReturnType<typeof buildRepoRankingItemList>) =>
  list?.itemListElement.map(({ position, name }) => [position, name]);

describe('buildRepoRankingItemList', () => {
  it('positions each repository by its rank, else by its row on the page', () => {
    const list = buildRepoRankingItemList('Repos', '/repos/2', 's', [row('a/b', 101), row('c/d', null)], 100);

    expect(positions(list)).toEqual([
      [101, 'a/b'],
      [102, 'c/d'],
    ]);
    expect(list?.itemListElement[0].url).toMatch(/\/repo\/a\/b$/);
  });

  it('reads the rank the table shows', () => {
    const list = buildRepoRankingItemList('Rust', '/repos/language/Rust/1', 'l', [row('a/b', 900, 1)], 0);

    expect(positions(list)).toEqual([[1, 'a/b']]);
  });

  it('skips rows without a repository', () => {
    expect(positions(buildRepoRankingItemList('Repos', '/repos/1', 's', [row(null, 1), row('a/b', 2)], 0))).toEqual([
      [2, 'a/b'],
    ]);
    expect(buildRepoRankingItemList('Repos', '/repos/1', 's', [row(null, 1)], 0)).toBeNull();
  });
});
