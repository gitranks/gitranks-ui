import { describe, expect, it } from 'vitest';

import { NPM_NAME_MAX_LENGTH } from './npm-package-name';
import { foldPypiName, isPypiProjectName, PYPI_NAME_MAX_LENGTH } from './pypi-project-name';
import {
  ALL_REGISTRY_IDS,
  anyRegistryPackageText,
  apiRegistryOf,
  canonicalNameOf,
  DEFAULT_REGISTRY,
  DOWNLOADS_PENDING,
  downloadsCountOf,
  downloadsUnitOf,
  isDownloadsPending,
  isListedApiRegistry,
  isNameSegmentCount,
  isPackageName,
  isRegistryId,
  isRegistryRow,
  LISTED_REGISTRIES,
  nameOfSegments,
  packageDisplayNameOf,
  packageKeyOf,
  packageOfKey,
  REGISTRIES,
  REGISTRY_IDS,
  registryDownloadsText,
  registryHasDownloads,
  registryLabelList,
  registryManifestList,
  registryOfApi,
  registryRowOfApi,
  segmentsOfName,
} from './registries';
import { PackageRegistry } from '@/types/generated/graphql';

describe('the registry table', () => {
  it('lists npm, the default, then PyPI, Go, crates.io, pub.dev and Packagist, as the API names them', () => {
    expect(REGISTRY_IDS).toEqual(['npm', 'pypi', 'go', 'crates', 'pub', 'packagist']);
    expect(DEFAULT_REGISTRY).toBe('npm');
    expect(apiRegistryOf('npm')).toBe(PackageRegistry.Npm);
    expect(apiRegistryOf('pypi')).toBe(PackageRegistry.Pypi);
    expect(registryOfApi('NPM')).toBe('npm');
    expect(registryOfApi('PYPI')).toBe('pypi');
    expect(registryOfApi('GO')).toBe('go');
    expect(registryOfApi('CRATES')).toBe('crates');
    expect(registryOfApi('PUB')).toBe('pub');
    expect(registryOfApi('PACKAGIST')).toBe('packagist');
    expect(registryOfApi('npm')).toBeNull();
    expect(registryOfApi('CARGO')).toBeNull();
    expect(registryOfApi(null)).toBeNull();
  });

  it("has a row for every registry the API's enum has, and no other", () => {
    expect(ALL_REGISTRY_IDS.map((id) => REGISTRIES[id].api).sort()).toEqual(Object.values(PackageRegistry).sort());
  });

  it('shows the registries its list names, in the order of the table: npm, PyPI, Go, crates.io, pub.dev and Packagist for now', () => {
    expect(LISTED_REGISTRIES).toEqual(['npm', 'pypi', 'go', 'crates', 'pub', 'packagist']);
    expect(ALL_REGISTRY_IDS).toEqual(['npm', 'pypi', 'go', 'crates', 'pub', 'packagist', 'maven']);
    expect(REGISTRY_IDS).toEqual(['npm', 'pypi', 'go', 'crates', 'pub', 'packagist']);
    // A row not listed yet: the table knows it, nothing a visitor reaches does.
    expect(isRegistryRow('maven')).toBe(true);
    expect(isRegistryId('maven')).toBe(false);
    expect(registryRowOfApi('MAVEN')).toBe('maven');
    expect(registryOfApi('MAVEN')).toBeNull();
    expect(isListedApiRegistry('MAVEN')).toBe(false);
    expect(isRegistryRow('cargo')).toBe(false);
  });

  it("keeps npm's traits: its page, its names, its two segments, its weekly downloads", () => {
    const npm = REGISTRIES.npm;
    expect(npm.label).toBe('npm');
    expect(npm.pageUrl('@types/node')).toBe('https://www.npmjs.com/package/@types/node');
    expect(npm.nameMaxLength).toBe(NPM_NAME_MAX_LENGTH);
    expect(npm.path).toEqual({ min: 1, max: 2, join: '/', scope: '@' });
    expect(npm.downloads).toBe('week');
    expect(registryHasDownloads('npm')).toBe(true);
    expect(npm.manifest).toBe('package.json');
  });

  it("keeps PyPI's traits: its page, its one-segment names, its monthly downloads", () => {
    const pypi = REGISTRIES.pypi;
    expect(pypi.label).toBe('PyPI');
    expect(pypi.article).toBe('a');
    expect(pypi.pageUrl('zope-interface')).toBe('https://pypi.org/project/zope-interface/');
    expect(pypi.nameMaxLength).toBe(PYPI_NAME_MAX_LENGTH);
    expect(pypi.path).toEqual({ min: 1, max: 1, join: '/' });
    expect(pypi.downloads).toBe('month');
    expect(registryHasDownloads('pypi')).toBe(true);
    expect(pypi.examples[0]).toBe('requests');
  });

  it("keeps pub.dev's traits: its page, its one-segment lower-case names, its pubspec.yaml, its monthly downloads", () => {
    const pub = REGISTRIES.pub;
    expect(pub.label).toBe('pub.dev');
    expect(pub.article).toBe('a');
    expect(pub.pageUrl('http')).toBe('https://pub.dev/packages/http');
    expect(pub.pageUrlPrefix.test('https://pub.dev/packages/provider')).toBe(true);
    expect(pub.path).toEqual({ min: 1, max: 1, join: '/' });
    expect(pub.manifest).toBe('pubspec.yaml');
    expect(pub.downloads).toBe('month');
    expect(canonicalNameOf('pub', 'shared_preferences')).toBe('shared_preferences');
  });

  it("treats pub.dev as a registry without download counts until its first month's count is read", () => {
    expect(Object.keys(DOWNLOADS_PENDING)).toEqual(['pub']);
    expect(DOWNLOADS_PENDING.pub).toBe('early December 2026');
    expect(isDownloadsPending('pub')).toBe(true);
    expect(isDownloadsPending('pypi')).toBe(false);
    expect(downloadsUnitOf('pub')).toBeNull();
    expect(registryHasDownloads('pub')).toBe(false);
    expect(registryDownloadsText('pub')).toBe('pub.dev downloads');
    // Every other registry keeps its row's unit, Go its none.
    expect(downloadsUnitOf('npm')).toBe('week');
    expect(downloadsUnitOf('pypi')).toBe('month');
    expect(downloadsUnitOf('go')).toBeNull();
    expect(downloadsUnitOf('crates')).toBe('week');
  });

  it('takes a pasted pypi.org project address, and no other site', () => {
    const prefix = REGISTRIES.pypi.pageUrlPrefix;
    for (const url of [
      'https://pypi.org/project/',
      'http://www.pypi.org/project/',
      'pypi.org/project/',
      'PyPI.org/project/',
    ]) {
      expect(prefix.test(url), url).toBe(true);
    }
    for (const url of ['https://pypi.org/simple/', 'https://notpypi.org/project/', 'https://test.pypi.org/project/']) {
      expect(prefix.test(url), url).toBe(false);
    }
  });

  it('takes a registry only as spelled, never one inherited from an object', () => {
    expect(isRegistryId('npm')).toBe(true);
    expect(isRegistryId('pypi')).toBe(true);
    for (const value of ['NPM', 'PyPI', 'cargo', 'constructor', 'toString', '', null, 1]) {
      expect(isRegistryId(value), String(value)).toBe(false);
    }
  });

  it("checks npm names by npm's own rule", () => {
    expect(isPackageName('npm', 'react')).toBe(true);
    expect(isPackageName('npm', '@types/node')).toBe(true);
    expect(isPackageName('npm', '.env')).toBe(false);
    expect(isPackageName('npm', 'nebula/ui')).toBe(false);
  });

  it("checks PyPI names by PyPI's own rule: letters and digits, `.`, `_` and `-` inside, any case, 214 at most", () => {
    for (const name of [
      'requests',
      'Django',
      'zope.interface',
      'zope_interface',
      'a',
      '1',
      'A-b.C_9',
      'x'.repeat(214),
    ]) {
      expect(isPackageName('pypi', name), name).toBe(true);
    }
    for (const name of ['', '-x', 'x-', '.x', 'x.', '_x', 'x_', 'a b', 'a/b', '@a/b', 'é', 'a+b', 'x'.repeat(215)]) {
      expect(isPackageName('pypi', name), name).toBe(false);
      expect(isPypiProjectName(name), name).toBe(false);
    }
  });

  it('folds a PyPI name as PyPI compares names, and leaves an npm name as it is', () => {
    expect(foldPypiName('Django')).toBe('django');
    expect(canonicalNameOf('pypi', 'zope.interface')).toBe('zope-interface');
    expect(canonicalNameOf('pypi', 'Zope__Interface')).toBe('zope-interface');
    expect(canonicalNameOf('pypi', 'a.-_b')).toBe('a-b');
    expect(canonicalNameOf('pypi', 'requests')).toBe('requests');
    expect(canonicalNameOf('npm', 'React-Tools')).toBe('React-Tools');
    expect(canonicalNameOf('npm', '@types/node')).toBe('@types/node');
  });
});

describe('names and URL segments', () => {
  it('joins one or two segments into an npm name, and refuses any other count or name', () => {
    expect(nameOfSegments('npm', ['react'])).toBe('react');
    expect(nameOfSegments('npm', ['@types', 'node'])).toBe('@types/node');
    expect(nameOfSegments('npm', [])).toBeNull();
    expect(nameOfSegments('npm', ['@a', 'b', 'c'])).toBeNull();
    expect(nameOfSegments('npm', ['nebula', 'ui'])).toBeNull();
    expect(nameOfSegments('npm', ['.env'])).toBeNull();
  });

  it('splits a name back into its segments', () => {
    expect(segmentsOfName('npm', 'react')).toEqual(['react']);
    expect(segmentsOfName('npm', '@types/node')).toEqual(['@types', 'node']);
  });

  it("counts an npm name's segments by its scope: two behind an @scope, else one", () => {
    expect(isNameSegmentCount('npm', ['react'])).toBe(true);
    expect(isNameSegmentCount('npm', ['@types', 'node'])).toBe(true);
    expect(isNameSegmentCount('npm', ['@types'])).toBe(false);
    expect(isNameSegmentCount('npm', ['nebula', 'ui'])).toBe(false);
    expect(isNameSegmentCount('npm', [])).toBe(false);
  });

  it('reads a PyPI name from one segment only', () => {
    expect(nameOfSegments('pypi', ['zope.interface'])).toBe('zope.interface');
    expect(nameOfSegments('pypi', ['zope', 'interface'])).toBeNull();
    expect(nameOfSegments('pypi', ['@types', 'node'])).toBeNull();
    expect(nameOfSegments('pypi', ['-x'])).toBeNull();
    expect(segmentsOfName('pypi', 'zope-interface')).toEqual(['zope-interface']);
    expect(isNameSegmentCount('pypi', ['requests'])).toBe(true);
    expect(isNameSegmentCount('pypi', ['a', 'b'])).toBe(false);
  });
});

describe('package keys', () => {
  it('names a package `<registry>/<name>`, split back at the first slash', () => {
    expect(packageKeyOf({ registry: 'npm', name: '@types/node' })).toBe('npm/@types/node');
    expect(packageOfKey('npm/@types/node')).toEqual({ registry: 'npm', name: '@types/node' });
    expect(packageOfKey('npm/react')).toEqual({ registry: 'npm', name: 'react' });
    expect(packageOfKey('pypi/zope-interface')).toEqual({ registry: 'pypi', name: 'zope-interface' });
    for (const key of [
      'react',
      'cargo/react',
      'npm/',
      'npm/.env',
      'npm/nebula/ui',
      '/react',
      'NPM/react',
      'pypi/a/b',
    ]) {
      expect(packageOfKey(key), key).toBeNull();
    }
  });

  it("shows a package's name alone on the default registry", () => {
    expect(packageDisplayNameOf({ registry: 'npm', name: 'react' })).toBe('react');
    expect(packageDisplayNameOf({ registry: 'pypi', name: 'requests' })).toBe('pypi/requests');
  });
});

describe('copy from the table', () => {
  it('writes npm as before', () => {
    expect(registryDownloadsText('npm')).toBe('npm downloads a week');
    expect(registryManifestList(['npm'])).toBe('package.json');
  });

  it('names every registry where the copy lists every one, and a package alone past two', () => {
    expect(registryLabelList()).toBe('npm, PyPI, Go, crates.io, pub.dev and Packagist');
    expect(registryLabelList('or')).toBe('npm, PyPI, Go, crates.io, pub.dev or Packagist');
    expect(anyRegistryPackageText()).toBe('package');
    expect(anyRegistryPackageText(true)).toBe('a package');
    expect(registryManifestList()).toBe(
      'package.json, requirements.txt, pyproject.toml, go.mod, Cargo.toml, pubspec.yaml or composer.json',
    );
    expect(registryManifestList(['pypi'])).toBe('requirements.txt or pyproject.toml');
  });

  it("says PyPI's downloads as last month's", () => {
    expect(registryDownloadsText('pypi')).toBe('PyPI downloads last month');
  });
});

describe("a package's downloads in its registry's unit", () => {
  const downloads = { lastWeek: 1_030_000, previousWeek: 990_000, last30Days: 4_400_000, previous30Days: 4_100_000 };

  it("reads last week's on a registry counted by the week, and the month just ended on one counted by the month", () => {
    expect(downloadsCountOf('week', downloads)).toEqual({ last: 1_030_000, previous: 990_000 });
    expect(downloadsCountOf('month', { ...downloads, lastWeek: null, previousWeek: null })).toEqual({
      last: 4_400_000,
      previous: 4_100_000,
    });
  });

  it('has none without counts, without a unit, or without the count of its unit', () => {
    expect(downloadsCountOf('week', null)).toBeNull();
    expect(downloadsCountOf(null, downloads)).toBeNull();
    expect(downloadsCountOf('week', { ...downloads, lastWeek: null })).toBeNull();
    expect(downloadsCountOf('week', { lastWeek: 5 })).toEqual({ last: 5, previous: null });
  });
});
