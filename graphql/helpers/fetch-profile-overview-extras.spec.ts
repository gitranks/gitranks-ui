import { beforeEach, describe, expect, it, vi } from 'vitest';

import { fetchProfileOverviewExtras } from './fetch-profile-overview-extras';
import { fetchRankedCounts } from './fetch-ranked-counts';

vi.mock('./fetch-ranked-counts', () => ({ fetchRankedCounts: vi.fn() }));

const counts = (sUsers: number) => ({ sUsers, cUsers: sUsers, fUsers: sUsers });

describe('fetchProfileOverviewExtras', () => {
  beforeEach(() => {
    vi.mocked(fetchRankedCounts).mockReset();
    vi.mocked(fetchRankedCounts).mockImplementation(async (name) => counts(name === 'global' ? 1000 : 50));
  });

  it('reads the worldwide and the country counts', async () => {
    await expect(fetchProfileOverviewExtras({ country: 'Germany' })).resolves.toEqual({
      rankedGlobal: counts(1000),
      rankedCountry: counts(50),
      complete: true,
    });
    expect(fetchRankedCounts).toHaveBeenCalledWith('Germany');
  });

  it('reads no country counts without a country', async () => {
    await expect(fetchProfileOverviewExtras({ country: null })).resolves.toEqual({
      rankedGlobal: counts(1000),
      rankedCountry: null,
      complete: true,
    });
    expect(fetchRankedCounts).toHaveBeenCalledTimes(1);
  });

  it('renders without a part it could not read, and says so', async () => {
    vi.mocked(fetchRankedCounts).mockResolvedValueOnce(undefined);

    await expect(fetchProfileOverviewExtras({ country: 'Germany' })).resolves.toEqual({
      rankedGlobal: null,
      rankedCountry: counts(50),
      complete: false,
    });
  });

  it('treats a ranking with no counts as a complete read', async () => {
    vi.mocked(fetchRankedCounts).mockResolvedValueOnce(null);

    await expect(fetchProfileOverviewExtras({ country: 'Germany' })).resolves.toEqual({
      rankedGlobal: null,
      rankedCountry: counts(50),
      complete: true,
    });
  });

  it('reads nothing for a missing profile', async () => {
    await expect(fetchProfileOverviewExtras(null)).resolves.toEqual({
      rankedGlobal: null,
      rankedCountry: null,
      complete: true,
    });
    expect(fetchRankedCounts).not.toHaveBeenCalled();
  });
});
