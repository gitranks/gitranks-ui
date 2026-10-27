import { beforeEach, describe, expect, it, vi } from 'vitest';

import { HISTORY_READ_STARS } from './pending';

const cacheLife = vi.fn();
vi.mock('next/cache', () => ({ cacheLife, cacheTag: vi.fn() }));
vi.mock('@/lib/graphql/graphql-direct', () => ({ graphqlDirect: vi.fn() }));

const { keepFor } = await import('./load');
const { orgBig, repoBig, repoMid, userMid } = await import('./fixtures');

beforeEach(() => cacheLife.mockReset());

describe('keepFor', () => {
  it('keeps badge data an hour, a small repository without history included', () => {
    for (const facts of [repoBig, repoMid, userMid, orgBig, null]) keepFor(facts);
    expect(cacheLife.mock.calls).toEqual(Array.from({ length: 5 }, () => ['hours']));
  });

  it('keeps it minutes where it will change with nothing to expire it', () => {
    keepFor({ ...repoMid, stars: HISTORY_READ_STARS });
    keepFor({ ...userMid, s: null, c: null, f: null });
    expect(cacheLife.mock.calls).toEqual([['minutes'], ['minutes']]);
  });
});
