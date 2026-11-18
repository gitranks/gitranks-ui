import { describe, expect, it } from 'vitest';

import { NPM_NAME_MAX_LENGTH } from './npm-package-name';
import {
  anyRegistryPackageText,
  apiRegistryOf,
  DEFAULT_REGISTRY,
  isNameSegmentCount,
  isPackageName,
  isRegistryId,
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
  segmentsOfName,
} from './registries';
import { PackageRegistry } from '@/types/generated/graphql';

describe('the registry table', () => {
  it('lists npm alone, the default, as the API names it', () => {
    expect(REGISTRY_IDS).toEqual(['npm']);
    expect(DEFAULT_REGISTRY).toBe('npm');
    expect(apiRegistryOf('npm')).toBe(PackageRegistry.Npm);
    expect(registryOfApi('NPM')).toBe('npm');
    expect(registryOfApi('npm')).toBeNull();
    expect(registryOfApi(null)).toBeNull();
  });

  it("names every registry the API's enum has, and no other", () => {
    expect(REGISTRY_IDS.map((id) => REGISTRIES[id].api).sort()).toEqual(Object.values(PackageRegistry).sort());
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

  it('takes a registry only as spelled, never one inherited from an object', () => {
    expect(isRegistryId('npm')).toBe(true);
    for (const value of ['NPM', 'pypi', 'constructor', 'toString', '', null, 1]) {
      expect(isRegistryId(value), String(value)).toBe(false);
    }
  });

  it("checks npm names by npm's own rule", () => {
    expect(isPackageName('npm', 'react')).toBe(true);
    expect(isPackageName('npm', '@types/node')).toBe(true);
    expect(isPackageName('npm', '.env')).toBe(false);
    expect(isPackageName('npm', 'nebula/ui')).toBe(false);
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
});

describe('package keys', () => {
  it('names a package `<registry>/<name>`, split back at the first slash', () => {
    expect(packageKeyOf({ registry: 'npm', name: '@types/node' })).toBe('npm/@types/node');
    expect(packageOfKey('npm/@types/node')).toEqual({ registry: 'npm', name: '@types/node' });
    expect(packageOfKey('npm/react')).toEqual({ registry: 'npm', name: 'react' });
    for (const key of ['react', 'pypi/react', 'npm/', 'npm/.env', 'npm/nebula/ui', '/react', 'NPM/react']) {
      expect(packageOfKey(key), key).toBeNull();
    }
  });

  it("shows a package's name alone on the default registry", () => {
    expect(packageDisplayNameOf({ registry: 'npm', name: 'react' })).toBe('react');
  });
});

describe('copy from the table', () => {
  it('writes npm as before', () => {
    expect(registryLabelList()).toBe('npm');
    expect(registryLabelList('or')).toBe('npm');
    expect(anyRegistryPackageText()).toBe('npm package');
    expect(anyRegistryPackageText(true)).toBe('an npm package');
    expect(registryDownloadsText('npm')).toBe('npm downloads a week');
    expect(registryManifestList()).toBe('package.json');
  });
});
