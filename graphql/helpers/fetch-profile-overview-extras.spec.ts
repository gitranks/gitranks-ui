import { beforeEach, describe, expect, it, vi } from 'vitest';

import { fetchProfileOverviewExtras } from './fetch-profile-overview-extras';
import { fetchRankedCounts } from './fetch-ranked-counts';
import { fetchStarsNeighbours } from './fetch-stars-neighbours';

vi.mock('./fetch-ranked-counts', () => ({ fetchRankedCounts: vi.fn() }));
vi.mock('./fetch-stars-neighbours', () => ({ fetchStarsNeighbours: vi.fn() }));

const counts = (sUsers: number) => ({ sUsers, cUsers: sUsers, fUsers: sUsers });
const neighbours = [{ rank: 12, login: 'octocat', stars: 100 }];

describe('fetchProfileOverviewExtras', () => {
  beforeEach(() => {
    vi.mocked(fetchRankedCounts).mockReset();
    vi.mocked(fetchRankedCounts).mockImplementation(async (name) => counts(name === 'global' ? 1000 : 50));
    vi.mocked(fetchStarsNeighbours).mockReset();
    vi.mocked(fetchStarsNeighbours).mockResolvedValue(neighbours);
  });

  it('reads the worldwide and country counts and the neighbours of a ranked profile', async () => {
    await expect(
      fetchProfileOverviewExtras({ country: 'Germany', rankGlobal: { s: 12 } }, { neighbours: true }),
    ).resolves.toEqual({
      rankedGlobal: counts(1000),
      rankedCountry: counts(50),
      starsNeighbours: neighbours,
      complete: true,
    });
    expect(fetchRankedCounts).toHaveBeenCalledWith('Germany');
    expect(fetchStarsNeighbours).toHaveBeenCalledWith(12);
  });

  it('reads no country counts without a country, and no neighbours unless asked', async () => {
    const extras = await fetchProfileOverviewExtras({ country: null, rankGlobal: { s: 12 } }, { neighbours: false });

    expect(extras).toEqual({ rankedGlobal: counts(1000), rankedCountry: null, starsNeighbours: [], complete: true });
    expect(fetchRankedCounts).toHaveBeenCalledTimes(1);
    expect(fetchStarsNeighbours).not.toHaveBeenCalled();
  });

  it('reads no neighbours for a provisional rank, which is not in the ranking yet', async () => {
    await fetchProfileOverviewExtras({ rankGlobal: { s: null } }, { neighbours: true });

    expect(fetchStarsNeighbours).not.toHaveBeenCalled();
  });

  it('renders without a part it could not read, and says so', async () => {
    vi.mocked(fetchRankedCounts).mockRejectedValueOnce(new Error('down'));
    vi.mocked(fetchStarsNeighbours).mockRejectedValueOnce(new Error('down'));

    await expect(
      fetchProfileOverviewExtras({ country: 'Germany', rankGlobal: { s: 12 } }, { neighbours: true }),
    ).resolves.toEqual({ rankedGlobal: null, rankedCountry: counts(50), starsNeighbours: [], complete: false });
  });

  it('reads nothing for a missing profile', async () => {
    await expect(fetchProfileOverviewExtras(null, { neighbours: true })).resolves.toEqual({
      rankedGlobal: null,
      rankedCountry: null,
      starsNeighbours: [],
      complete: true,
    });
    expect(fetchRankedCounts).not.toHaveBeenCalled();
  });
});
