import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

import { notReadPackage, quietPackage, rankedPackage } from '@/app/package/[registry]/[...name]/__fixtures__/package';
import { PackageScreen } from '@/app/package/[registry]/[...name]/components/package-screen';
import { buildPackageSummary } from '@/app/package/[registry]/[...name]/utils/package-summary';
import { downloadsRanking, packageRankingFacts } from '@/app/packages/__fixtures__/package-rankings';
import { PackageRankingFrame, PackageRankingScreen } from '@/app/packages/components/package-ranking-view';
import { UsedByScreen } from '@/app/repo/[owner]/[name]/(tabs)/used-by/components/used-by-screen';
import { buildUsedBySEO } from '@/app/repo/[owner]/[name]/tab-seo';
import { buildUsedBySummary, noDependentsNote, usedByCardLine } from '@/app/repo/[owner]/[name]/utils/used-by-summary';
import {
  dependentRows,
  firstPage,
  fivePackages,
  noDependents,
  onePackage,
  threePackages,
} from '@/components/dependents/dependents.fixtures';

// Every npm string the package pages, the rankings and the Used by tab draw, pinned as they were before the registry
// table: a change here is a change a visitor sees.

vi.hoisted(() => {
  process.env.NEXT_PUBLIC_URI = 'https://gitranks.com';
});
vi.mock('@/components/header/header', () => ({ Header: () => null }));
vi.mock('@/components/package-follow/follow-slot', () => ({
  FollowSlot: (props: { packages: unknown; label: string }) => (
    <div data-follow={JSON.stringify(props.packages)} data-label={props.label} />
  ),
}));
vi.mock('@/app/package/[registry]/[...name]/components/package-updates-button', () => ({
  PackageUpdatesButton: () => <div data-updates />,
}));
vi.mock('@/app/package/[registry]/[...name]/components/package-badge-section', () => ({
  PackageBadgeSection: () => <div data-badges />,
}));
vi.mock('@/app/package/[registry]/[...name]/components/downloads-chart', () => ({
  default: (props: { label: string }) => <div data-chart={props.label} />,
}));
vi.mock('@/components/ranking-table/clickable-row', () => ({
  ClickableRow: ({ children }: { children: React.ReactNode }) => <tr>{children}</tr>,
}));
vi.mock('next/navigation', () => ({
  usePathname: () => '/x',
  useRouter: () => ({ push: vi.fn() }),
}));

describe('npm copy', () => {
  it('draws the package page as before', () => {
    for (const pkg of [rankedPackage, quietPackage, notReadPackage]) {
      expect(
        renderToStaticMarkup(<PackageScreen registry="npm" name={pkg.name} pkg={pkg} />),
        pkg.name,
      ).toMatchSnapshot();
    }
    expect(renderToStaticMarkup(<PackageScreen registry="npm" name="@acme/x" pkg="unavailable" />)).toMatchSnapshot();
    expect(buildPackageSummary('npm', rankedPackage, rankedPackage.dependents?.items[0])).toMatchSnapshot();
    expect(buildPackageSummary('npm', quietPackage)).toMatchSnapshot();
  });

  it('draws the rankings as before', () => {
    for (const order of ['downloads', 'dependents-stars', 'dependents'] as const) {
      expect(
        renderToStaticMarkup(
          <PackageRankingFrame registry="npm" order={order} downloadsThrough="2026-11-15">
            <p>page</p>
          </PackageRankingFrame>,
        ),
        order,
      ).toMatchSnapshot();
    }
    expect(
      renderToStaticMarkup(
        <PackageRankingScreen
          registry="npm"
          registryLabel="npm"
          order="downloads"
          page={1}
          rows={downloadsRanking}
          facts={packageRankingFacts}
        />,
      ),
    ).toMatchSnapshot();
  });

  it("draws a repository's Used by as before", () => {
    for (const packages of [onePackage, threePackages, fivePackages, noDependents]) {
      expect(
        renderToStaticMarkup(<UsedByScreen nameWithOwner="nebula/ui" packages={packages} firstPage={firstPage} />),
      ).toMatchSnapshot();
      expect(buildUsedBySummary('nebula/ui', packages, dependentRows)).toMatchSnapshot();
      expect(usedByCardLine(packages)).toMatchSnapshot();
      expect(noDependentsNote(packages)).toMatchSnapshot();
      const repo = { nameWithOwner: 'nebula/ui' } as Parameters<typeof buildUsedBySEO>[0];
      expect(buildUsedBySEO(repo, packages, dependentRows).metadata.description).toMatchSnapshot();
    }
  });
});
