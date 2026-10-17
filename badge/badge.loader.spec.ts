import { beforeEach, describe, expect, it, vi } from 'vitest';

import { InvalidScoreError, RanksAreNotAvailableError } from './badge.errors';
import { badgeDataLoader } from './badge.loader';
import { getCanonicalBadgeParams } from './canonical-badge';
import { graphqlDirect } from '@/lib/graphql/graphql-direct';

vi.mock('@/lib/graphql/graphql-direct', () => ({ graphqlDirect: vi.fn() }));

const profile = (rankGlobal: Record<string, number> | null, f = 12) => ({
  user: { githubId: 'U_1', country: null, snapshots: null, s: 0, c: 0, f, rankGlobal },
});

const load = () => badgeDataLoader('newcomer', getCanonicalBadgeParams('followers-rank'));

describe('badgeDataLoader', () => {
  beforeEach(() => {
    vi.mocked(graphqlDirect).mockReset();
  });

  it('uses the provisional rank of a profile that has no rank yet', async () => {
    vi.mocked(graphqlDirect).mockResolvedValueOnce(profile({ fProvisional: 4321 }));

    await expect(load()).resolves.toMatchObject({ position: 4321 });
  });

  it('prefers the rank over the provisional one, as the rank card does', async () => {
    vi.mocked(graphqlDirect).mockResolvedValueOnce(profile({ f: 4000, fProvisional: 4321 }));

    await expect(load()).resolves.toMatchObject({ position: 4000 });
  });

  it('has no badge without any rank', async () => {
    vi.mocked(graphqlDirect).mockResolvedValueOnce(profile(null));

    await expect(load()).rejects.toBeInstanceOf(RanksAreNotAvailableError);
  });

  it('has no badge below the entry score', async () => {
    vi.mocked(graphqlDirect).mockResolvedValueOnce(profile({ f: 9000 }, 4));

    await expect(load()).rejects.toBeInstanceOf(InvalidScoreError);
  });
});
