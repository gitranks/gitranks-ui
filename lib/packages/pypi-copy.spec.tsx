import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

import { pypiMonths, spelledPackage } from '@/app/package/[registry]/[...name]/__fixtures__/package';
import { PackageDownloadsCard } from '@/app/package/[registry]/[...name]/components/package-downloads-card';
import { PackageScreen } from '@/app/package/[registry]/[...name]/components/package-screen';
import { buildPackageSEO } from '@/app/package/[registry]/[...name]/seo';
import {
  downloadsHistoryOf,
  lastMonthPeriodOf,
  yearOfDownloads,
} from '@/app/package/[registry]/[...name]/utils/package-downloads';
import { buildPackageSummary } from '@/app/package/[registry]/[...name]/utils/package-summary';
import { PackagesTable } from '@/app/repo/[owner]/[name]/(tabs)/used-by/components/packages-table';
import { buildUsedByQuestions, usedByCardLine } from '@/app/repo/[owner]/[name]/utils/used-by-summary';
import { fivePackages, onePackage } from '@/components/dependents/dependents.fixtures';
import type { PackagePage } from '@/graphql/package-page';
import type { RepoPackage } from '@/graphql/repo-packages';
import { packageMarkdownOf } from '@/lib/packages/package-markdown';

// What a PyPI project's pages say about its downloads: PyPI counts them a calendar month at a time, so the site says
// last month's where npm says a week's, and draws months where npm draws weeks.

vi.hoisted(() => {
  process.env.NEXT_PUBLIC_URI = 'https://gitranks.com';
});
vi.mock('@/components/header/header', () => ({ Header: () => null }));
vi.mock('@/components/ranking-table/clickable-row', () => ({
  ClickableRow: ({ children }: { children: React.ReactNode }) => <tr>{children}</tr>,
}));
vi.mock('next/navigation', () => ({ usePathname: () => '/x', useRouter: () => ({ push: vi.fn() }) }));
vi.mock('@/components/package-follow/follow-slot', () => ({ FollowSlot: () => null }));
vi.mock('@/app/package/[registry]/[...name]/components/package-updates-button', () => ({
  PackageUpdatesButton: () => null,
}));
vi.mock('@/app/package/[registry]/[...name]/components/package-badge-section', () => ({
  PackageBadgeSection: () => null,
}));
vi.mock('@/app/package/[registry]/[...name]/components/downloads-chart', () => ({
  default: (props: { label: string; unit?: string; points: unknown[] }) => (
    <div data-chart={props.label} data-unit={props.unit} data-points={props.points.length} />
  ),
}));

const text = (html: string) =>
  html
    .replace(/<[^>]+>/g, ' ')
    .replaceAll('&#x27;', "'")
    .replace(/\s+/g, ' ')
    .trim();
const summaryText = (parts: readonly (string | { text: string })[]) =>
  parts.map((part) => (typeof part === 'string' ? part : part.text)).join('');

const pypi = spelledPackage;
const downloads = pypi.downloads!;

describe("a PyPI project's downloads, a month at a time", () => {
  it('reads the month just ended against the one before and a year before, from its months', () => {
    expect(lastMonthPeriodOf(downloads)).toEqual({
      total: 4_400_000,
      label: 'in October',
      changes: [{ change: 2, against: 'vs Sep' }],
      series: pypiMonths,
    });
    // Before its first whole month is held: the counts as the API gives them.
    expect(lastMonthPeriodOf({ ...downloads, months: [] })).toEqual({
      total: 4_400_000,
      label: 'last month',
      changes: [{ change: 2, against: 'vs the month before' }],
      series: [],
    });
  });

  it('totals its months since the first one read, and the last 12 once it has them', () => {
    expect(downloadsHistoryOf('month', downloads)).toMatchObject({
      points: pypiMonths,
      total: 28_700_000,
      totalLabel: 'since April 2026',
      range: 'Apr 2026 – Oct 2026',
    });
    expect(downloadsHistoryOf('month', { ...downloads, months: pypiMonths.slice(-1) })).toMatchObject({
      totalLabel: 'in October 2026',
      range: 'Oct 2026',
    });
    expect(yearOfDownloads('month', downloads)).toBeNull();
    const year = Array.from({ length: 14 }, (_, i) => ({
      start: new Date(Date.UTC(2025, i, 1)).toISOString(),
      downloads: 10,
    }));
    expect(yearOfDownloads('month', { ...downloads, months: year })).toBe(120);
    expect(downloadsHistoryOf('month', { ...downloads, months: year })).toMatchObject({
      total: 120,
      totalLabel: 'in the last 12 months',
    });
  });

  it('draws the Downloads card with last month alone: no Week, no per star', () => {
    const card = text(
      renderToStaticMarkup(<PackageDownloadsCard registry="pypi" downloads={downloads} repo={pypi.repo} />),
    );
    expect(card).toBe('Downloads 4,400,000 in October ↑2% vs Sep');
  });

  it('says its months on the page: the history, the summary and the empty state', () => {
    const html = renderToStaticMarkup(<PackageScreen registry="pypi" name="zope-interface" pkg={pypi} />);
    const page = text(html);

    expect(page).toContain('Downloads by month 28.7 million since April 2026');
    expect(html).toContain(
      'data-chart="Monthly downloads from PyPI, Apr 2026 – Oct 2026: 28.7 million since April 2026"',
    );
    expect(html).toContain('data-unit="month" data-points="7"');
    expect(page).toContain('Monthly downloads from PyPI, Apr 2026 – Oct 2026.');
    expect(page).not.toMatch(/week/i);

    expect(summaryText(buildPackageSummary('pypi', pypi))).toMatch(
      /^zope\.interface is a PyPI package downloaded 4,400,000 times last month\. 16 repositories/,
    );

    const unused = { ...pypi, dependentsCount: 0, dependents: { total: 0, archived: 0, items: [] } } as PackagePage;
    const none = text(renderToStaticMarkup(<PackageScreen registry="pypi" name="zope-interface" pkg={unused} />));
    expect(none).toContain('No repository with 100+ stars uses zope.interface directly yet');
    expect(none).toContain('zope.interface is a PyPI package downloaded 4,400,000 times last month.');
    expect(none).not.toMatch(/week/i);
  });

  it('says last month in the description, the structured data and the facts in markdown', () => {
    const { metadata, jsonLd } = buildPackageSEO(pypi, 'zope-interface', [], 'pypi');
    expect(metadata.description).toContain('4,400,000 downloads last month.');
    expect(metadata.description).toContain('PyPI rank #1,234 by downloads');
    expect(JSON.stringify(jsonLd)).toContain('"userInteractionCount":4400000');

    const markdown = packageMarkdownOf(pypi, 'pypi');
    expect(markdown).toContain(
      '- Downloads: 4,400,000 in October 2026, 4,300,000 the month before (PyPI downloads are counted a calendar month at a time).',
    );
    expect(markdown).toContain('- #1,234 by monthly downloads');
    expect(markdown).not.toContain('7 days');
  });
});

describe("a repository's PyPI packages on its Used by tab", () => {
  // A repository's packages carry last week's downloads alone: PyPI's are null.
  const zope: RepoPackage = { registry: 'PYPI', name: 'zope-interface', dependents: 40, downloadsLastWeek: null };

  it('says nothing of downloads for a repository whose packages are all on PyPI', () => {
    const one = { ...onePackage, items: [zope], downloadsLastWeek: 0 };
    expect(usedByCardLine(one)).toMatchObject({
      downloads: null,
      what: 'repositories with 100+ stars depend on its PyPI package zope-interface.',
    });
    expect(buildUsedByQuestions('zopefoundation/zope.interface', one, []).at(-1)?.answer).toMatch(
      /^From each repository's own requirements\.txt or pyproject\.toml files/,
    );
  });

  it("adds up the npm packages' weeks beside PyPI's, and marks PyPI's row with a dash", () => {
    const mixed = { ...fivePackages, items: [zope, ...fivePackages.items.slice(1)] };
    expect(usedByCardLine(mixed).downloads).toBe('584k');
    expect(buildUsedByQuestions('nebula/ui', mixed, [])[1].answer).toBe(
      'zope-interface: 40 repositories with 100+ stars.',
    );
    const table = text(renderToStaticMarkup(<PackagesTable packages={mixed} />));
    expect(table).toContain('Downloads a week');
    expect(table).toContain('zope-interface PyPI 40 —');
    expect(table).toContain('@nebula/icons npm 61 96,140');

    const onlyPypi = text(
      renderToStaticMarkup(<PackagesTable packages={{ total: 4, items: [zope, zope, zope, zope] }} />),
    );
    expect(onlyPypi).not.toContain('Downloads a week');
  });
});
