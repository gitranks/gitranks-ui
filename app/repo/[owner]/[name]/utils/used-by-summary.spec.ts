import { describe, expect, it } from 'vitest';

import {
  buildUsedByQuestions,
  buildUsedBySummary,
  formatDownloadsShort,
  noDependentsNote,
  noDependentsTitle,
  usedByCardLine,
} from './used-by-summary';
import type { SummaryPart } from '@/app/profile/[login]/utils/profile-summary';
import {
  dependentRows,
  fivePackages,
  noDependents,
  onePackage,
  threePackages,
} from '@/components/dependents/dependents.fixtures';

const text = (parts: SummaryPart[]) => parts.map((part) => (typeof part === 'string' ? part : part.text)).join('');
const links = (parts: SummaryPart[]) => parts.flatMap((part) => (typeof part === 'string' ? [] : [part.href]));

describe('buildUsedBySummary', () => {
  it('says it for two or three packages, as the board does', () => {
    const parts = buildUsedBySummary('nebula/ui', threePackages, dependentRows);

    expect(text(parts)).toBe(
      'nebula/ui publishes 3 npm packages: @nebula/ui, @nebula/icons and @nebula/tokens. 231 repositories with 100+ stars depend on at least one of them directly. The most-starred is orbit-hq/console (48,210 stars), followed by lumen-labs/studio and kestrel/admin-kit. Together the packages are downloaded 527,322 times a week on npm. Dependents read on November 16, 2026; downloads updated November 17, 2026.',
    );
    expect(links(parts)).toEqual([
      '/package/npm/@nebula/ui',
      '/package/npm/@nebula/icons',
      '/package/npm/@nebula/tokens',
      '/repo/orbit-hq/console',
    ]);
  });

  it('says it for one package', () => {
    expect(text(buildUsedBySummary('nebula/ui', onePackage, dependentRows))).toBe(
      'nebula/ui publishes one npm package, @nebula/ui. 214 repositories with 100+ stars depend on it directly; the most-starred is orbit-hq/console (48,210 stars). It is downloaded 412,880 times a week on npm. Dependents read on November 16, 2026.',
    );
  });

  it('says it for four or more, naming the one without a dependent', () => {
    expect(text(buildUsedBySummary('nebula/ui', fivePackages, dependentRows))).toBe(
      'nebula/ui publishes 5 npm packages. 252 repositories with 100+ stars depend on at least one of them directly; @nebula/ui is used most (214), and @nebula/cli has no such dependents yet. Together they are downloaded 583,668 times a week on npm. Dependents read on November 16, 2026.',
    );
    const twoUnused = {
      ...fivePackages,
      items: fivePackages.items.map((pkg) => (pkg.name === '@nebula/tokens' ? { ...pkg, dependents: 0 } : pkg)),
    };
    expect(text(buildUsedBySummary('nebula/ui', twoUnused, dependentRows))).toContain(
      ', and 2 of them have no such dependents yet.',
    );
  });

  it('says when no repository with 100+ stars uses it yet', () => {
    expect(text(buildUsedBySummary('nebula/ui', noDependents, []))).toBe(
      'nebula/ui publishes one npm package, @nebula/ui. No repository with 100+ stars depends on it directly yet. It is downloaded 2,118 times a week on npm.',
    );
    expect(text(buildUsedBySummary('nebula/ui', { ...threePackages, dependents: 0 }, []))).toContain(
      'No repository with 100+ stars depends on any of them directly yet. Together the packages are downloaded',
    );
  });
});

describe('the empty state', () => {
  it('names the package and the next read', () => {
    expect(noDependentsTitle(noDependents)).toBe('No repository with 100+ stars uses @nebula/ui directly yet');
    expect(noDependentsNote(noDependents)).toBe(
      'We read every repository with 100+ stars once a month. The next read is on December 16, 2026. It is downloaded 2,118 times a week on npm.',
    );
    expect(noDependentsTitle(threePackages)).toBe('No repository with 100+ stars uses its packages directly yet');
  });
});

describe("the Overview card's line", () => {
  it('counts the dependents and the packages, downloads short', () => {
    expect(usedByCardLine(threePackages)).toEqual({
      dependents: '231',
      what: 'repositories with 100+ stars depend on its 3 npm packages, ',
      downloads: '527k',
    });
    expect(usedByCardLine(onePackage).what).toBe('repositories with 100+ stars depend on its npm package @nebula/ui, ');
    expect([2_118, 54_210, 1_234_567].map(formatDownloadsShort)).toEqual(['2,118', '54.2k', '1.23M']);
  });
});

describe('buildUsedByQuestions', () => {
  it('asks who uses it, which package is used most and how it is counted, as the board does', () => {
    expect(buildUsedByQuestions('nebula/ui', threePackages, dependentRows)).toEqual([
      {
        question: 'Who uses nebula/ui?',
        answer:
          '231 repositories with 100+ stars depend on its packages directly. The most-starred are orbit-hq/console, lumen-labs/studio and kestrel/admin-kit.',
      },
      {
        question: 'Which nebula/ui package is used most?',
        answer: '@nebula/ui: 214 repositories with 100+ stars and 412,880 downloads a week.',
      },
      {
        question: 'How is this counted?',
        answer:
          "From each repository's own package.json files, workspaces included. Lockfiles, forks and example, docs or test folders don't count. We read every repository with 100+ stars once a month.",
      },
    ]);
  });

  it('leaves out the most used package for one package, and every question without a dependent', () => {
    expect(buildUsedByQuestions('nebula/ui', onePackage, dependentRows).map(({ question }) => question)).toEqual([
      'Who uses nebula/ui?',
      'How is this counted?',
    ]);
    expect(buildUsedByQuestions('nebula/ui', noDependents, [])).toEqual([]);
  });
});
