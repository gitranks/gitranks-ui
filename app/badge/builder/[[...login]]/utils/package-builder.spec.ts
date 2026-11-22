import { describe, expect, it } from 'vitest';

import { findHeading, missingHref } from '../components/find-step';
import { BADGE_CHECK_COPY, badgeCheckViewOf, isBadgeCheckResult, readmeOf } from './badge-check';
import { badgeAlt, entityName, offeredBadges } from './badge-options';
import {
  anyPackageRefOf,
  builderHref,
  entityLabel,
  isEntityName,
  parseBuilderQuery,
  parsePackageSearch,
  searchLookups,
  stepOf,
} from './builder-state';
import { builderView } from './builder-view';
import { badgeLinkUrl, badgePath, entityPageUrl } from './snippets';
import { findBadge } from '@/badge/v3/catalogue';
import { NOW, packageBig, packageNew } from '@/badge/v3/fixtures';

const ORIGIN = 'https://gitranks.com';

describe('a package in the builder URL', () => {
  it('names the package and its badge', () => {
    const query = new URLSearchParams('package=npm/@nebula/ui&badge=used-by');
    const shown = parseBuilderQuery(query);
    expect(shown).toMatchObject({ kind: 'package', name: 'npm/@nebula/ui', badge: { id: 'used-by' } });
    expect(stepOf(shown)).toBe('style');
  });

  it('leaves the other kinds first, as they were', () => {
    expect(parseBuilderQuery(new URLSearchParams('user=a&package=npm/b'))).toMatchObject({
      kind: 'user',
      name: 'a',
    });
  });

  it('names a package by `npm/<name>`, and links to it with the @ and the / readable', () => {
    expect(isEntityName('package', 'npm/react')).toBe(true);
    expect(isEntityName('package', 'npm/@types/node')).toBe(true);
    expect(isEntityName('package', 'react')).toBe(false);
    expect(isEntityName('package', 'npm/types/node')).toBe(false);
    expect(isEntityName('package', 'pypi/react')).toBe(false);
    expect(entityLabel('package', 'npm/@types/node')).toBe('@types/node');
    expect(entityLabel('repo', 'acme/fastqueue')).toBe('acme/fastqueue');
    expect(
      builderHref({ kind: 'package', name: 'npm/@types/node', badge: findBadge('package', 'downloads'), embed: true }),
    ).toBe('/badge/builder?package=npm/@types/node&badge=downloads&step=embed');
    expect(builderHref({ kind: 'package', name: 'npm/react' })).toBe('/badge/builder?package=npm/react');
  });

  it('says it has no npm package by that name, by its own name', () => {
    expect(
      builderView(parseBuilderQuery(new URLSearchParams('package=npm/left-pad')), {
        wellFormed: true,
        factsState: { status: 'missing' },
        badgeAvailable: false,
      }),
    ).toEqual({ step: 'find', notice: 'GitRanks has no npm package called “left-pad” yet.' });
  });
});

describe('a Find search', () => {
  it('reads a package name, an npm page address, `npm:` and a version after the name', () => {
    expect(parsePackageSearch('react')).toBe('npm/react');
    expect(parsePackageSearch(' @types/node ')).toBe('npm/@types/node');
    expect(parsePackageSearch('https://www.npmjs.com/package/@types/node')).toBe('npm/@types/node');
    expect(parsePackageSearch('npm:react@19.0.0')).toBe('npm/react');
    expect(parsePackageSearch('@types/node@22')).toBe('npm/@types/node');
    expect(parsePackageSearch('acme/fastqueue')).toBeNull();
    expect(parsePackageSearch('.hidden')).toBeNull();
  });

  it('finds a developer, an organization and a package by a name, and only a package for a scoped name or an npm address', () => {
    expect(searchLookups('react', null)).toEqual([
      { kind: 'user', name: 'react' },
      { kind: 'org', name: 'react' },
      { kind: 'package', name: 'npm/react' },
    ]);
    expect(searchLookups('@types/node', null)).toEqual([{ kind: 'package', name: 'npm/@types/node' }]);
    expect(searchLookups('npm:lodash', null)).toEqual([{ kind: 'package', name: 'npm/lodash' }]);
    expect(searchLookups('acme/fastqueue', null)).toEqual([{ kind: 'repo', name: 'acme/fastqueue' }]);
    expect(searchLookups('react', 'user')).toEqual([{ kind: 'user', name: 'react' }]);
    expect(searchLookups('@types/node', 'package')).toEqual([{ kind: 'package', name: 'npm/@types/node' }]);
    expect(searchLookups('acme/fastqueue', 'package')).toEqual([]);
    expect(searchLookups('vercel', 'org')).toEqual([{ kind: 'org', name: 'vercel' }]);
  });

  it("asks for a package by its kind's words, and sends a miss to its page", () => {
    expect(findHeading('package', null)).toBe('Which npm package is the badge for?');
    expect(findHeading('package', findBadge('package', 'used-by'))).toBe(
      'Find your npm package for the “used by” badge',
    );
    expect(missingHref('npm/@nebula/ui', 'package')).toBe('/package/npm/@nebula/ui');
    expect(missingHref('acme/fastqueue', null)).toBe('/repo/acme/fastqueue');
  });
});

describe("a package's code", () => {
  it("keeps the scope's @ in the image, and links to the package's page", () => {
    expect(badgePath('package', 'npm/@nebula/ui', 'used-by')).toBe('/badge/package/npm/@nebula/ui/used-by.svg');
    expect(badgePath('repo', 'acme/fast.queue', 'rank')).toBe('/badge/repo/acme/fast.queue/rank.svg');
    expect(entityPageUrl(ORIGIN, 'package', 'npm/@nebula/ui')).toBe('https://gitranks.com/package/npm/@nebula/ui');
    expect(badgeLinkUrl(ORIGIN, 'downloads', 'package', 'npm/react')).toBe('https://gitranks.com/package/npm/react');
  });

  it('names the package itself in the alt text', () => {
    const badge = findBadge('package', 'downloads')!;
    expect(entityName(packageBig)).toBe('npm/react-resize-detector');
    expect(badgeAlt(packageBig, badge, {}, NOW)).toBe('react-resize-detector on GitRanks: npm downloads 1.8M a week');
  });

  it('offers what a package has: 6 shields, 3 cards and the chart; less for a new one', () => {
    expect(offeredBadges(packageBig, NOW)).toHaveLength(10);
    expect(offeredBadges(packageNew, NOW).map(({ badge }) => badge.id)).toEqual([
      'downloads',
      'downloads-year',
      'downloads-card',
      'package-card',
    ]);
  });
});

describe("a package's daily updates card", () => {
  it('says where the badge goes before the first check', () => {
    expect(badgeCheckViewOf('package', 'npm/react', null)).toMatchObject({
      state: 'idle',
      text: BADGE_CHECK_COPY.intro.package,
      action: 'Check my badge',
    });
    expect(BADGE_CHECK_COPY.intro.package).toBe(
      'A package with a GitRanks badge updates every day. The badge goes in the README of the repository that publishes it: add the code there, then check it here.',
    );
  });

  it("names its repository's README, and says when there is none to check", () => {
    expect(readmeOf('package', 'npm/react', 'facebook/react')).toBe('facebook/react');
    expect(readmeOf('package', 'npm/react')).toBe('its repository');
    expect(
      badgeCheckViewOf('package', 'npm/react', { status: 'not_found', checksLeft: 1 }, Date.now(), 'facebook/react')
        .text,
    ).toContain('README of facebook/react');
    expect(badgeCheckViewOf('package', 'npm/react', { status: 'no_repository' })).toEqual({
      state: 'no-repository',
      text: 'We could not find this package’s repository, so there is no README to check.',
      note: null,
      action: null,
    });
    expect(isBadgeCheckResult({ status: 'no_repository' })).toBe(true);
  });
});

describe('anyPackageRefOf', () => {
  it('reads a registry only before a slash that is not the first character', () => {
    expect(anyPackageRefOf('npm/@types/node')).toEqual({ registry: 'npm', name: '@types/node' });
    expect(anyPackageRefOf('react')).toEqual({ registry: 'npm', name: 'react' });
    expect(anyPackageRefOf('/npm')).toEqual({ registry: 'npm', name: '/npm' });
    expect(anyPackageRefOf('pypi/x')).toEqual({ registry: 'npm', name: 'pypi/x' });
  });
});
