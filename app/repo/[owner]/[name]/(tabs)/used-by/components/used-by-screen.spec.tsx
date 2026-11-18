import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

import { followOf, shownAfter, usedByRouteQuery } from './used-by-list';
import { UsedByScreen } from './used-by-screen';
import {
  dependentRows,
  firstPage,
  fivePackages,
  noDependents,
  onePackage,
  threePackages,
} from '@/components/dependents/dependents.fixtures';
import type { FollowSlotProps } from '@/components/package-follow/follow-slot';

const { followSlot } = vi.hoisted(() => ({ followSlot: vi.fn((_props: unknown) => null) }));
vi.mock('@/components/package-follow/follow-slot', () => ({
  FollowSlot: (props: FollowSlotProps) => {
    followSlot(props);
    return <div data-follow={props.placement} data-label={props.label} />;
  },
}));
vi.mock('next/navigation', () => ({
  usePathname: () => '/repo/nebula/ui/used-by',
  useRouter: () => ({ push: vi.fn() }),
}));

const text = (html: string) =>
  html
    .replace(/<svg[\s\S]*?<\/svg>/g, '')
    .replace(/<[^>]+>/g, ' ')
    .replaceAll('&#x27;', "'")
    .replace(/\s+/g, ' ')
    .trim();
const headers = (html: string) => [...html.matchAll(/<th[^>]*>([\s\S]*?)<\/th>/g)].map(([, inner]) => text(inner));

const screen = (props: Partial<Parameters<typeof UsedByScreen>[0]> = {}) =>
  renderToStaticMarkup(
    <UsedByScreen nameWithOwner="nebula/ui" packages={threePackages} firstPage={firstPage} {...props} />,
  );

describe('UsedByScreen', () => {
  it('draws two or three packages as cards, chips to filter by, the table with Uses, Questions and Follow', () => {
    const html = screen();

    expect(html.match(/<a class="flex w-full flex-col[^"]*" href="\/package\/npm\/@nebula\/[a-z]+"/g)).toHaveLength(3);
    expect(text(html)).toContain('All packages @nebula/ui @nebula/icons @nebula/tokens');
    expect(html).toContain('aria-pressed="true"');
    expect(headers(html)).toEqual(['#', 'Most-starred dependents', 'Uses', 'Stars']);
    expect(text(html)).toContain('1–12 of 231');
    expect(text(html)).toContain('Hide archived');
    expect(text(html)).toContain('quill-app/editor Archived');
    expect(html).toMatch(/<h2[^>]*>Questions<\/h2>[\s\S]*<dt[^>]*>Who uses nebula\/ui\?<\/dt>/);
    expect(html).toContain('"@type":"FAQPage"');
    expect(html.indexOf('Questions')).toBeLessThan(html.indexOf('data-follow="used-by"'));
    expect(html).toContain('data-label="@nebula/ui"');
  });

  it('draws one package as one wide card, the table without a filter or Uses', () => {
    const html = screen({ packages: onePackage, firstPage: { ...firstPage, total: 214 } });

    expect(text(html)).toContain(
      '@nebula/ui The npm package this repository publishes 214 repos with 100+ stars use it',
    );
    expect(text(html)).not.toContain('All packages');
    expect(headers(html)).toEqual(['#', 'Most-starred dependents', 'Stars']);
    expect(text(html)).toContain('Hide archived');
    expect(text(html)).not.toContain('Which nebula/ui package is used most?');
  });

  it('draws four or more as a table of packages, a menu to filter by, and Follow for all of them', () => {
    const html = screen({ packages: fivePackages, firstPage: { ...firstPage, total: 252 } });

    expect(text(html)).toContain('5 packages Sorted by repos with 100+ stars');
    expect(text(html)).toContain('@nebula/cli none yet 2,118');
    expect(html).toContain('aria-haspopup="menu"');
    expect(text(html)).toContain('All 5 packages');
    expect(html).toContain('data-label="nebula/ui packages"');
  });

  it('counts the packages past the top ones the API lists', () => {
    const html = screen({ packages: { ...fivePackages, total: 57 }, firstPage });
    expect(text(html)).toContain('and 52 more');
  });

  it('leaves Hide archived out of a list without an archived row', () => {
    const html = screen({
      firstPage: { ...firstPage, archived: 0, items: dependentRows.filter((row) => !row.archived) },
    });
    expect(text(html)).not.toContain('Hide archived');
  });

  it('draws the empty state without a dependent: the next read, Follow and the package page', () => {
    const html = screen({ packages: noDependents, firstPage: null });

    expect(text(html)).toContain('No repository with 100+ stars uses @nebula/ui directly yet');
    expect(text(html)).toContain('The next read is on December 16, 2026.');
    expect(html).toContain('data-follow="used-by-empty"');
    expect(text(html)).toContain('Package page');
    expect(html).not.toContain('<table');
    expect(text(html)).not.toContain('Questions');
  });

  it('draws one state while package data cannot be read', () => {
    for (const html of [screen({ packages: 'unavailable', firstPage: null }), screen({ firstPage: 'unavailable' })]) {
      expect(text(html)).toBe(
        "Used by Repositories with 100+ stars that depend directly on a package this repository publishes. Forks, lockfiles and example folders don't count. Read monthly; downloads from npm, weekly. Package data is not available right now. Try again in a few minutes.",
      );
    }
  });
});

describe('the list', () => {
  it('reads more from the route handler, the filter and the toggle in its query', () => {
    expect(usedByRouteQuery(0, null, false)).toBe('');
    expect(usedByRouteQuery(25, '@nebula/ui', true)).toBe('?offset=25&package=%40nebula%2Fui&archived=0');
  });

  it('follows the package the list is cut to, else the most used, else all of four or more', () => {
    const names = fivePackages.items;
    expect(followOf('nebula/ui', names, 5, '@nebula/cli')).toEqual({
      packages: [{ registry: 'npm', name: '@nebula/cli' }],
      label: '@nebula/cli',
    });
    expect(followOf('nebula/ui', threePackages.items, 3, null).label).toBe('@nebula/ui');
    expect(followOf('nebula/ui', names, 5, null)).toEqual({
      packages: names.map(({ name }) => ({ registry: 'npm', name })),
      label: 'nebula/ui packages',
    });
  });
});

describe('Show more', () => {
  const page = (from: number, count: number, total = 231) => ({
    total,
    archived: 0,
    items: Array.from({ length: count }, (_, i) => ({ ...dependentRows[0], nameWithOwner: `o/r${from + i}` })),
  });

  it('reads on a page size past the last read, even when a page held fewer rows', () => {
    // Rows of removed accounts are left out but counted: 23 rows in the first page of 25.
    const first = shownAfter(null, page(0, 23), 0, null, false);
    expect(first.nextOffset).toBe(25);
    expect(first.more).toBe(false);

    const full = shownAfter(null, page(0, 25), 0, null, false);
    expect(full).toMatchObject({ nextOffset: 25, more: true });
    const second = shownAfter(full, page(25, 25), 25, null, false);
    expect(second).toMatchObject({ nextOffset: 50, more: true });
    expect(second.items).toHaveLength(50);
  });

  it('hides the button once the next read would start past the total, and adds no row twice', () => {
    const full = shownAfter(null, page(0, 25, 50), 0, null, false);
    const last = shownAfter(full, { ...page(24, 25, 50) }, 25, null, false);

    expect(last.more).toBe(false);
    expect(last.items).toHaveLength(49);
    expect(new Set(last.items.map(({ nameWithOwner }) => nameWithOwner)).size).toBe(49);
  });

  it('stops at offset 5000, the furthest page the API serves', () => {
    const atLimit = shownAfter(null, page(4975, 25, 9000), 4975, null, false);
    expect(atLimit).toMatchObject({ nextOffset: 5000, more: true });
    const past = shownAfter(null, page(5000, 25, 9000), 5000, null, false);
    expect(past).toMatchObject({ nextOffset: 5025, more: false });
  });

  it('starts over on a new filter', () => {
    const full = shownAfter(null, page(0, 25), 0, null, false);
    expect(shownAfter(full, page(100, 3, 3), 0, '@nebula/tokens', true)).toMatchObject({
      pkg: '@nebula/tokens',
      hideArchived: true,
      nextOffset: 25,
      more: false,
    });
  });

  it('marks the list busy while it reads and says its count politely', () => {
    const html = screen();
    expect(html).toContain('aria-busy="false"');
    expect(html).toMatch(/<span class="font-mono tabular-nums" aria-live="polite">1–12 of 231<\/span>/);
    // 12 rows of 231: a short first page, so no more to read.
    expect(text(html)).not.toContain('Show more');
  });
});
