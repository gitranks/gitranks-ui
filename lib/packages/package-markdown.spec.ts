import { describe, expect, it, vi } from 'vitest';

import { packageMarkdownOf, packageMarkdownPath } from './package-markdown';
import { quietPackage, rankedPackage } from '@/app/package/[registry]/[...name]/__fixtures__/package';

vi.hoisted(() => {
  process.env.NEXT_PUBLIC_URI = 'https://gitranks.com';
});

describe('packageMarkdownOf', () => {
  it("writes a ranked package's facts, ranks and dependents, each with its link", () => {
    expect(packageMarkdownOf(rankedPackage, 'npm')).toBe(`# react-resize-detector (npm package)

> A Cross-Browser, Event-based, Element Resize Detection for React

- GitRanks page: https://gitranks.com/package/npm/react-resize-detector
- npm: https://www.npmjs.com/package/react-resize-detector
- Source: https://github.com/acme/react-resize-detector
- Source on GitRanks: https://gitranks.com/repo/acme/react-resize-detector
- Latest version: 12.3.0 (125 releases)
- License: MIT

## Usage

- Used by 16 public repositories with 100+ stars (16,429 stars between them), each listing it in its own package.json.
- Downloads: 1,797,999 in the last 7 days, ${rankedPackage.downloads?.last30Days.toLocaleString('en-US')} in the last 30 days (through November 16, 2026).
- Dependents last read: November 16, 2026.

## Ranks among npm packages

- #1,234 by weekly downloads: https://gitranks.com/packages/npm/downloads/13
- #40 by dependents' stars: https://gitranks.com/packages/npm/dependents-stars/1
- #230 by dependents: https://gitranks.com/packages/npm/dependents/3

## Repositories that use it, most-starred first (the first 2; all of them on the GitRanks page)

1. kiali/kiali (3,649 stars): https://gitranks.com/repo/kiali/kiali
2. notea-org/notea (2,142 stars, archived): https://gitranks.com/repo/notea-org/notea

How these numbers are counted: https://gitranks.com/methodology/packages
`);
  });

  it('says when no repository with 100+ stars uses a package, with no ranks or list, its scope kept', () => {
    const text = packageMarkdownOf(quietPackage, 'npm');

    expect(text).toContain('# @nebula/ui (npm package)');
    expect(text).toContain('- GitRanks page: https://gitranks.com/package/npm/@nebula/ui');
    expect(text).toContain('- Source: https://github.com/nebula/ui');
    expect(text).not.toContain('Source on GitRanks');
    expect(text).toContain('- No public repository with 100+ stars lists it in its own package.json yet.');
    expect(text).not.toContain('## Ranks');
    expect(text).not.toContain('## Repositories');
  });

  it('keeps registry text on one line, so it cannot start a heading or a list', () => {
    const text = packageMarkdownOf(
      {
        ...rankedPackage,
        description: 'Line one\n# Not a heading\n- not a list',
        deprecated: 'Use\n\nsomething else',
      },
      'npm',
    );

    expect(text).toContain('> Line one # Not a heading - not a list\n');
    expect(text).toContain('- Deprecated: Use something else\n');
  });

  it('links a rank only to a ranking page that lists it', () => {
    const text = packageMarkdownOf({ ...rankedPackage, ranks: { downloads: { rank: 48_000 } } }, 'npm');

    expect(text).toContain('- #48,000 by weekly downloads\n');
  });

  it('lives next to the page', () => {
    expect(packageMarkdownPath('react')).toBe('/package/npm/react/facts.md');
    expect(packageMarkdownPath('@types/node')).toBe('/package/npm/@types/node/facts.md');
  });
});
