import { cacheLife } from 'next/cache';
import { notFound } from 'next/navigation';
import type { ReactElement } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { downloadsRanking, packageRankingFacts } from '../../../__fixtures__/package-rankings';
import PackageRankingLayout, { generateStaticParams } from './layout';
import PackageRankingPage, { generateMetadata } from './page';
import { fetchPackageRankingFacts, fetchPackageRankings } from '@/graphql/helpers/fetch-package-rankings';
import { PackageRankingType, PackageRegistry } from '@/types/generated/graphql';

vi.mock('next/cache', () => ({ cacheLife: vi.fn() }));
vi.mock('next/navigation', () => ({
  notFound: vi.fn(() => {
    throw new Error('NEXT_NOT_FOUND');
  }),
}));
vi.mock('@/graphql/helpers/fetch-package-rankings', () => ({
  fetchPackageRankings: vi.fn(),
  fetchPackageRankingFacts: vi.fn(),
}));
vi.mock('@/components/header/header', () => ({ Header: () => null }));

type Params = { registry: string; by: string; page: string };
const params = (overrides: Partial<Params> = {}) =>
  ({
    params: Promise.resolve({ registry: 'npm', by: 'downloads', page: '1', ...overrides }),
  }) as PageProps<'/packages/[registry]/[by]/[page]'>;

const screenProps = async (overrides: Partial<Params> = {}) =>
  ((await PackageRankingPage(params(overrides))) as ReactElement<Record<string, unknown>>).props;

describe('a package ranking page', () => {
  beforeEach(() => {
    vi.mocked(cacheLife).mockReset();
    vi.mocked(notFound).mockClear();
    vi.mocked(fetchPackageRankings).mockReset().mockResolvedValue(downloadsRanking);
    vi.mocked(fetchPackageRankingFacts).mockReset().mockResolvedValue(packageRankingFacts);
  });

  it('reads its page of the ranking and, on the first page, the facts; kept for hours', async () => {
    const props = await screenProps({ by: 'dependents-stars' });

    expect(fetchPackageRankings).toHaveBeenCalledWith({
      registry: PackageRegistry.Npm,
      by: PackageRankingType.DependentsStars,
      offset: 0,
    });
    expect(fetchPackageRankingFacts).toHaveBeenCalledWith(PackageRegistry.Npm);
    expect(props).toMatchObject({
      order: 'dependents-stars',
      page: 1,
      rows: downloadsRanking,
      facts: packageRankingFacts,
    });
    expect(vi.mocked(cacheLife).mock.calls).toEqual([['hours']]);
  });

  it('reads a later page at its offset, without the facts', async () => {
    const props = await screenProps({ page: '3' });

    expect(fetchPackageRankings).toHaveBeenCalledWith(expect.objectContaining({ offset: 200 }));
    expect(fetchPackageRankingFacts).not.toHaveBeenCalled();
    expect(props.facts).toBeNull();
  });

  it('draws the unavailable state, kept for minutes, when the ranking cannot be read now', async () => {
    vi.mocked(fetchPackageRankings).mockResolvedValue(undefined);

    expect((await screenProps()).rows).toBeUndefined();
    expect(vi.mocked(cacheLife).mock.calls).toEqual([['minutes']]);
  });

  it('is kept for minutes when only the facts could not be read', async () => {
    vi.mocked(fetchPackageRankingFacts).mockResolvedValue(undefined);

    await screenProps();
    expect(vi.mocked(cacheLife).mock.calls).toEqual([['minutes']]);
  });

  it('is not found past the last page, or for params that can never name a ranking', async () => {
    vi.mocked(fetchPackageRankings).mockResolvedValue([]);
    await expect(screenProps({ page: '7' })).rejects.toThrow('NEXT_NOT_FOUND');

    for (const bad of [{ page: '52' }, { page: '0' }, { by: 'stars' }, { registry: 'NPM' }, { registry: 'cargo' }]) {
      await expect(screenProps(bad), JSON.stringify(bad)).rejects.toThrow('NEXT_NOT_FOUND');
    }
  });

  it('draws an empty first page rather than a 404 before anything is ranked', async () => {
    vi.mocked(fetchPackageRankings).mockResolvedValue([]);

    expect((await screenProps()).rows).toEqual([]);
  });

  it('has metadata from the page, and is not indexed while the ranking cannot be read', async () => {
    const metadata = await generateMetadata(params());
    expect(metadata.title).toBe('npm Package Ranking by Downloads');
    expect(metadata.robots).toBeUndefined();

    vi.mocked(cacheLife).mockReset();
    vi.mocked(fetchPackageRankings).mockResolvedValue(undefined);
    expect((await generateMetadata(params())).robots).toEqual({ index: false });
    expect(vi.mocked(cacheLife).mock.calls).toEqual([['minutes']]);
  });

  it('is not indexed while nothing is ranked yet, and is kept for minutes then', async () => {
    vi.mocked(fetchPackageRankings).mockResolvedValue([]);
    vi.mocked(cacheLife).mockReset();

    expect((await generateMetadata(params())).robots).toEqual({ index: false });
    expect(vi.mocked(cacheLife).mock.calls).toEqual([['minutes']]);
  });

  it('keeps its metadata as long as the page', async () => {
    await generateMetadata(params());
    expect(vi.mocked(cacheLife).mock.calls).toEqual([['hours']]);
  });
});

describe('the package ranking layout', () => {
  const layout = (overrides: Partial<Params> = {}) =>
    PackageRankingLayout({
      children: null,
      ...params(overrides),
    } as unknown as LayoutProps<'/packages/[registry]/[by]/[page]'>) as Promise<ReactElement<Record<string, unknown>>>;

  beforeEach(() => {
    vi.mocked(cacheLife).mockReset();
    vi.mocked(fetchPackageRankingFacts).mockReset().mockResolvedValue(packageRankingFacts);
  });

  it('gives the downloads header the last of its 7 days, kept for hours', async () => {
    expect((await layout()).props.downloadsThrough).toBe(packageRankingFacts.downloadsThrough);
    expect(vi.mocked(cacheLife).mock.calls).toEqual([['hours']]);
  });

  it('draws the header with no day, kept for minutes, when the facts cannot be read', async () => {
    vi.mocked(fetchPackageRankingFacts).mockResolvedValue(undefined);

    expect((await layout()).props.downloadsThrough).toBeUndefined();
    expect(vi.mocked(cacheLife).mock.calls).toEqual([['minutes']]);
  });

  it('lists the first page of each ranking, so an unlisted page renders whole and answers a real 404', async () => {
    expect(await generateStaticParams()).toEqual([
      { registry: 'npm', by: 'downloads', page: '1' },
      { registry: 'npm', by: 'dependents-stars', page: '1' },
      { registry: 'npm', by: 'dependents', page: '1' },
      { registry: 'pypi', by: 'downloads', page: '1' },
      { registry: 'pypi', by: 'dependents-stars', page: '1' },
      { registry: 'pypi', by: 'dependents', page: '1' },
      { registry: 'go', by: 'dependents-stars', page: '1' },
      { registry: 'go', by: 'dependents', page: '1' },
      { registry: 'crates', by: 'downloads', page: '1' },
      { registry: 'crates', by: 'dependents-stars', page: '1' },
      { registry: 'crates', by: 'dependents', page: '1' },
      // pub.dev's first download count is not read yet: no downloads ranking.
      { registry: 'pub', by: 'dependents-stars', page: '1' },
      { registry: 'pub', by: 'dependents', page: '1' },
      { registry: 'packagist', by: 'downloads', page: '1' },
      { registry: 'packagist', by: 'dependents-stars', page: '1' },
      { registry: 'packagist', by: 'dependents', page: '1' },
      // Maven Central publishes no download counts: no downloads ranking.
      { registry: 'maven', by: 'dependents-stars', page: '1' },
      { registry: 'maven', by: 'dependents', page: '1' },
      // NuGet's first download count is not read yet: no downloads ranking.
      { registry: 'nuget', by: 'dependents-stars', page: '1' },
      { registry: 'nuget', by: 'dependents', page: '1' },
    ]);
  });

  it('draws the frame of the ranking its params name, and is not found for any other', async () => {
    const frame = (await PackageRankingLayout({
      children: null,
      ...params({ by: 'dependents' }),
    } as unknown as LayoutProps<'/packages/[registry]/[by]/[page]'>)) as ReactElement<Record<string, unknown>>;

    expect(frame.props).toMatchObject({ registry: 'npm', order: 'dependents' });
    expect(frame.props).not.toHaveProperty('registryLabel');
    // Only the downloads ranking's header needs the facts.
    expect(fetchPackageRankingFacts).not.toHaveBeenCalled();
    await expect(
      PackageRankingLayout({
        children: null,
        ...params({ by: 'Downloads' }),
      } as unknown as LayoutProps<'/packages/[registry]/[by]/[page]'>),
    ).rejects.toThrow('NEXT_NOT_FOUND');
  });
});
