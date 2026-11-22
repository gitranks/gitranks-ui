import { cacheLife, cacheTag } from 'next/cache';
import { notFound, permanentRedirect } from 'next/navigation';
import type { ReactElement } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { notReadPackage, quietPackage, rankedPackage, spelledPackage } from './__fixtures__/package';
import PackagePageRoute, { generateMetadata, generateStaticParams, instant } from './page';
import { fetchPackage } from '@/graphql/helpers/fetch-package';

vi.mock('next/cache', () => ({ cacheLife: vi.fn(), cacheTag: vi.fn() }));
vi.mock('next/navigation', () => ({
  notFound: vi.fn(() => {
    throw new Error('NEXT_NOT_FOUND');
  }),
  permanentRedirect: vi.fn((path: string) => {
    throw new Error(`NEXT_REDIRECT ${path}`);
  }),
}));
vi.mock('@/graphql/helpers/fetch-package', () => ({
  PACKAGE_UNAVAILABLE: 'unavailable',
  fetchPackage: vi.fn(),
  isPackageSettling: (pkg: { state: string; refreshRunning?: boolean | null }) =>
    pkg.state === 'NOT_READ' || pkg.refreshRunning === true,
}));
vi.mock('@/components/header/header', () => ({ Header: () => null }));
// The badges read their own data, as the images do: a spec of their own draws them.
vi.mock('./components/package-badge-section', () => ({ PackageBadgeSection: () => null }));

const params = (registry: string, ...name: string[]) =>
  ({ params: Promise.resolve({ registry, name }) }) as PageProps<'/package/[registry]/[...name]'>;

const render = async (registry: string, ...name: string[]) =>
  ((await PackagePageRoute(params(registry, ...name))) as ReactElement<Record<string, unknown>>).props;

describe('a package page', () => {
  beforeEach(() => {
    vi.mocked(cacheLife).mockReset();
    vi.mocked(cacheTag).mockReset();
    vi.mocked(notFound).mockClear();
    vi.mocked(permanentRedirect).mockClear();
    vi.mocked(fetchPackage).mockReset().mockResolvedValue(rankedPackage);
  });

  it('lists one package a registry, so any other renders whole before its status', async () => {
    expect(instant).toBe(false);
    expect(await generateStaticParams()).toEqual([
      { registry: 'npm', name: ['react'] },
      { registry: 'pypi', name: ['requests'] },
      { registry: 'go', name: ['github.com', 'gin-gonic', 'gin'] },
      { registry: 'crates', name: ['serde'] },
      { registry: 'pub', name: ['http'] },
    ]);
  });

  it("sends another spelling of a PyPI name to the site's own, before anything is read", async () => {
    for (const [spelled, folded] of [
      ['Django', 'django'],
      ['zope.interface', 'zope-interface'],
      ['Zope__Interface', 'zope-interface'],
    ]) {
      await expect(render('pypi', spelled)).rejects.toThrow(`NEXT_REDIRECT /package/pypi/${folded}`);
      expect(await generateMetadata(params('pypi', spelled))).toEqual({});
    }
    expect(fetchPackage).not.toHaveBeenCalled();
    expect(cacheTag).not.toHaveBeenCalled();
  });

  it('draws a PyPI project at its folded name, tagged by it', async () => {
    vi.mocked(fetchPackage).mockResolvedValue({ ...rankedPackage, registry: 'PYPI', name: 'zope-interface' });

    expect(await render('pypi', 'zope-interface')).toMatchObject({ registry: 'pypi', name: 'zope-interface' });
    expect(fetchPackage).toHaveBeenCalledWith('pypi', 'zope-interface');
    expect(cacheTag).toHaveBeenCalledWith('package:pypi/zope-interface');
    expect(permanentRedirect).not.toHaveBeenCalled();
  });

  it('draws a read package, kept for hours under its tag, with its JSON-LD', async () => {
    const props = await render('npm', 'react-resize-detector');

    expect(props).toMatchObject({ name: 'react-resize-detector', pkg: rankedPackage });
    expect((props.jsonLd as object[]).length).toBe(3);
    expect(cacheTag).toHaveBeenCalledWith('package:npm/react-resize-detector');
    expect(cacheLife).toHaveBeenLastCalledWith('hours');
  });

  it('answers 404 for a name that names nothing, and for one the registry does not have', async () => {
    await expect(render('cargo', 'react')).rejects.toThrow('NEXT_NOT_FOUND');
    await expect(render('npm', 'nebula', 'ui')).rejects.toThrow('NEXT_NOT_FOUND');
    expect(fetchPackage).not.toHaveBeenCalled();

    vi.mocked(fetchPackage).mockResolvedValue(null);
    await expect(render('npm', 'gone')).rejects.toThrow('NEXT_NOT_FOUND');
  });

  it('draws a scoped package as Next hands its params, encoded for either spelling, with no redirect', async () => {
    vi.mocked(fetchPackage).mockResolvedValue(quietPackage);

    expect(await render('npm', '%40nebula', 'ui')).toMatchObject({ name: '@nebula/ui', pkg: quietPackage });
    expect(fetchPackage).toHaveBeenCalledWith('npm', '@nebula/ui');
    expect(permanentRedirect).not.toHaveBeenCalled();
    expect((await generateMetadata(params('npm', '%40nebula', 'ui'))).alternates?.canonical).toBe(
      '/package/npm/@nebula/ui',
    );
  });

  it('redirects a spelling the registry names otherwise to the registry’s own', async () => {
    vi.mocked(fetchPackage).mockResolvedValue(quietPackage);
    await expect(render('npm', '%40Nebula', 'ui')).rejects.toThrow('NEXT_REDIRECT /package/npm/@nebula/ui');
  });

  it('redirects another spelling, on a registry that folds names, to the address the API answers, read or not', async () => {
    vi.mocked(fetchPackage).mockResolvedValue(spelledPackage);
    await expect(render('npm', 'Zope_Interface')).rejects.toThrow('NEXT_REDIRECT /package/npm/zope-interface');
    expect(fetchPackage).toHaveBeenCalledWith('npm', 'Zope_Interface');
    expect(await generateMetadata(params('npm', 'Zope_Interface'))).toEqual({});

    vi.mocked(fetchPackage).mockResolvedValue(notReadPackage);
    await expect(render('npm', 'Left-Pad-Next')).rejects.toThrow('NEXT_REDIRECT /package/npm/left-pad-next');
  });

  it('keeps an npm name the API answers as written, capitals included, with no redirect', async () => {
    const capitals = { ...rankedPackage, name: 'React-Resize-Detector', displayName: 'React-Resize-Detector' };
    vi.mocked(fetchPackage).mockResolvedValue(capitals);

    expect(await render('npm', 'React-Resize-Detector')).toMatchObject({
      name: 'React-Resize-Detector',
      pkg: capitals,
    });
    expect(permanentRedirect).not.toHaveBeenCalled();
    expect((await generateMetadata(params('npm', 'React-Resize-Detector'))).alternates?.canonical).toBe(
      '/package/npm/React-Resize-Detector',
    );
  });

  it('draws the address name on a registry that folds names with no redirect, titled with its display name', async () => {
    vi.mocked(fetchPackage).mockResolvedValue(spelledPackage);

    expect(await render('npm', 'zope-interface')).toMatchObject({ name: 'zope-interface', pkg: spelledPackage });
    expect(permanentRedirect).not.toHaveBeenCalled();
    expect(cacheTag).toHaveBeenCalledWith('package:npm/zope-interface');
    const metadata = await generateMetadata(params('npm', 'zope-interface'));
    expect(metadata.title).toBe('zope.interface - npm package dependents, downloads and ranks');
    expect(metadata.alternates?.canonical).toBe('/package/npm/zope-interface');
  });

  it('answers 200 for a package not read yet and while package data is unavailable, each kept for minutes', async () => {
    vi.mocked(fetchPackage).mockResolvedValue(notReadPackage);
    expect(await render('npm', 'left-pad-next')).toMatchObject({ pkg: notReadPackage, jsonLd: [] });
    expect(cacheLife).toHaveBeenLastCalledWith('minutes');

    vi.mocked(fetchPackage).mockResolvedValue('unavailable');
    expect(await render('npm', 'react')).toMatchObject({ name: 'react', pkg: 'unavailable' });
    expect(cacheLife).toHaveBeenLastCalledWith('minutes');

    const metadata = await generateMetadata(params('npm', 'react'));
    expect(metadata.robots).toEqual({ index: false });
  });
});
