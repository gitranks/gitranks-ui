import { beforeEach, describe, expect, it, vi } from 'vitest';

import { fetchStarsNeighbours, MAX_NEIGHBOURS_OFFSET, NEIGHBOURS_WINDOW } from './fetch-stars-neighbours';
import { graphqlDirect } from '@/lib/graphql/graphql-direct';

vi.mock('next/cache', () => ({ cacheLife: vi.fn() }));
vi.mock('@/lib/graphql/graphql-direct', () => ({ graphqlDirect: vi.fn() }));

const LIMIT = NEIGHBOURS_WINDOW * 2 + 1;

describe('fetchStarsNeighbours', () => {
  beforeEach(() => {
    vi.mocked(graphqlDirect).mockReset();
    vi.mocked(graphqlDirect).mockResolvedValue({ globalRankings: [] });
  });

  const variablesOf = () => vi.mocked(graphqlDirect).mock.calls[0]?.[1];

  it('reads a window centred on the rank', async () => {
    await fetchStarsNeighbours(500);

    expect(variablesOf()).toEqual({ offset: 500 - NEIGHBOURS_WINDOW - 1, limit: LIMIT });
  });

  it('starts at the top for the first ranks', async () => {
    await fetchStarsNeighbours(1);
    await fetchStarsNeighbours(NEIGHBOURS_WINDOW + 1);

    expect(vi.mocked(graphqlDirect).mock.calls.map(([, variables]) => variables)).toEqual([
      { offset: 0, limit: LIMIT },
      { offset: 0, limit: LIMIT },
    ]);
  });

  it('reads up to the deepest offset the query takes, and nothing past it', async () => {
    await fetchStarsNeighbours(MAX_NEIGHBOURS_OFFSET + NEIGHBOURS_WINDOW + 1);
    expect(variablesOf()).toEqual({ offset: MAX_NEIGHBOURS_OFFSET, limit: LIMIT });

    vi.mocked(graphqlDirect).mockClear();
    await expect(fetchStarsNeighbours(MAX_NEIGHBOURS_OFFSET + NEIGHBOURS_WINDOW + 2)).resolves.toEqual([]);
    expect(graphqlDirect).not.toHaveBeenCalled();
  });

  it('keeps the rows that have a rank and a login', async () => {
    vi.mocked(graphqlDirect).mockResolvedValueOnce({
      globalRankings: [
        { s: 7, user: { login: 'seven', s: 900 } },
        { s: null, user: { login: 'unranked', s: 1 } },
        { s: 9, user: null },
        { s: 10, user: { login: 'ten', s: null } },
      ],
    });

    await expect(fetchStarsNeighbours(12)).resolves.toEqual([
      { rank: 7, login: 'seven', stars: 900 },
      { rank: 10, login: 'ten', stars: null },
    ]);
  });
});
