import { describe, expect, it } from 'vitest';

import { dependentRows, notReadPackage, quietPackage, rankedPackage } from '../__fixtures__/package';
import { buildPackageSummary, formatCountLong } from './package-summary';

const textOf = (parts: ReturnType<typeof buildPackageSummary>) =>
  parts.map((part) => (typeof part === 'string' ? part : part.text)).join('');

describe('buildPackageSummary', () => {
  it('says the downloads, who uses it, its source, and its versions, as the design does', () => {
    const parts = buildPackageSummary('npm', rankedPackage, dependentRows[0]);

    expect(textOf(parts)).toBe(
      'react-resize-detector is an npm package downloaded 1,797,999 times last week and 77.9 million times in the last 12 months. 16 repositories with 100+ stars depend on it directly, with 16,429 stars between them; the most-starred is kiali/kiali (3,649 stars). Its source is acme/react-resize-detector (1,302 stars). Latest version 12.3.0, first published November 19, 2015.',
    );
    expect(parts.filter((part) => typeof part !== 'string')).toEqual([
      { text: 'kiali/kiali', href: '/repo/kiali/kiali' },
      { text: 'acme/react-resize-detector', href: '/repo/acme/react-resize-detector' },
    ]);
  });

  it('says none uses it yet, and names a source repository without a page as text', () => {
    const text = textOf(buildPackageSummary('npm', quietPackage));

    expect(text).toContain('No repository with 100+ stars depends on it directly yet.');
    expect(text).toContain('Its source is nebula/ui.');
  });

  it('says only what it knows of a package not read yet', () => {
    expect(textOf(buildPackageSummary('npm', notReadPackage))).toBe(
      'left-pad-next is an npm package. No repository with 100+ stars depends on it directly yet.',
    );
  });

  it('writes large counts in words', () => {
    expect([formatCountLong(9_999), formatCountLong(77_900_000), formatCountLong(54_200)]).toEqual([
      '9,999',
      '77.9 million',
      '54.2 thousand',
    ]);
  });
});
