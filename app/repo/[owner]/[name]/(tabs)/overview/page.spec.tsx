import { cacheLife } from 'next/cache';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { repoForTab } from '../repo-tab-data';
import RepoOverviewPage from './page';
import { youngRepo } from '@/app/repo/[owner]/[name]/__fixtures__/repo';
import { fetchRepoPackages } from '@/graphql/helpers/fetch-repo-packages';
import { entityCards } from '@/lib/learn/__fixtures__/entity-card';
import { loadLearnEntityCard } from '@/lib/learn/entity-card.data';

vi.mock('next/cache', () => ({ cacheLife: vi.fn(), cacheTag: vi.fn() }));
vi.mock('../repo-tab-data', () => ({ repoForTab: vi.fn(), repoForTabMetadata: vi.fn() }));
vi.mock('@/graphql/helpers/fetch-repo-languages', () => ({ fetchRepoLanguages: vi.fn(async () => []) }));
vi.mock('@/graphql/helpers/fetch-repo-rank-tiers', () => ({
  fetchRepoRankTiers: vi.fn(async () => ({ tiers: null, ok: true })),
}));
vi.mock('@/graphql/helpers/fetch-repo-packages', () => ({
  UNAVAILABLE: 'unavailable',
  fetchRepoPackages: vi.fn(),
  fetchRepoUsedBy: vi.fn(),
}));
vi.mock('@/lib/learn/entity-card.data', () => ({ loadLearnEntityCard: vi.fn() }));

const render = () =>
  RepoOverviewPage({
    params: Promise.resolve({ owner: youngRepo.owner, name: youngRepo.name }),
  } as PageProps<'/repo/[owner]/[name]/overview'>);

beforeEach(() => {
  vi.mocked(cacheLife).mockReset();
  vi.mocked(repoForTab).mockResolvedValue(youngRepo);
  vi.mocked(fetchRepoPackages).mockResolvedValue(null);
  vi.mocked(loadLearnEntityCard).mockReset().mockResolvedValue({ card: null, ok: true });
});

describe("a repository's Overview and its Learn card", () => {
  it('reads the card by the repository’s stored name, with the page’s other reads, and hands it to the screen', async () => {
    vi.mocked(loadLearnEntityCard).mockResolvedValue({ card: entityCards.repoEverything, ok: true });
    const page = await render();

    expect(loadLearnEntityCard).toHaveBeenCalledWith({ repo: youngRepo.nameWithOwner });
    expect(page.props.learnCard).toEqual(entityCards.repoEverything);
    expect(cacheLife).not.toHaveBeenCalledWith('minutes');
  });

  it('is kept for minutes, without the card, when the card could not be read in time', async () => {
    vi.mocked(loadLearnEntityCard).mockResolvedValue({ card: null, ok: false });
    const page = await render();

    expect(page.props.learnCard).toBeNull();
    expect(cacheLife).toHaveBeenCalledWith('minutes');
  });
});
