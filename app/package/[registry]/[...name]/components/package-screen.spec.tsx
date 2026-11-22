import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

import { notReadPackage, onBadge, quietPackage, rankedPackage } from '../__fixtures__/package';
import { PackageScreen } from './package-screen';
import type { FollowSlotProps } from '@/components/package-follow/follow-slot';

vi.mock('@/components/header/header', () => ({ Header: () => <header data-header /> }));
vi.mock('@/components/package-follow/follow-slot', () => ({
  FollowSlot: (props: FollowSlotProps) => <div data-follow={props.placement} data-label={props.label} />,
}));
vi.mock('./package-updates-button', () => ({
  PackageUpdatesButton: (props: { name: string; repository?: string | null; refreshRunning?: boolean }) => (
    <div
      data-updates={props.name}
      data-repository={props.repository ?? ''}
      data-running={String(props.refreshRunning)}
    />
  ),
}));
// The badges read their own data, as the images do: a spec of their own draws them.
vi.mock('./package-badge-section', () => ({
  PackageBadgeSection: (props: { name: string }) => <div data-badges={props.name} />,
}));
vi.mock('./downloads-chart', () => ({ default: (props: { label: string }) => <div data-chart={props.label} /> }));
vi.mock('next/navigation', () => ({ usePathname: () => '/package/npm/x', useRouter: () => ({ push: vi.fn() }) }));

const text = (html: string) =>
  html
    .replace(/<svg[\s\S]*?<\/svg>/g, '')
    .replace(/<[^>]+>/g, ' ')
    .replaceAll('&#x27;', "'")
    .replaceAll('&amp;', '&')
    .replace(/\s+/g, ' ')
    .trim();
const headers = (html: string) => [...html.matchAll(/<th[^>]*>([\s\S]*?)<\/th>/g)].map(([, inner]) => text(inner));
const hrefs = (html: string) => [...html.matchAll(/href="([^"]+)"/g)].map(([, href]) => href);

describe('PackageScreen', () => {
  it('draws a ranked package: the left column, the two cards, who uses it, its downloads and, last, About', () => {
    const html = renderToStaticMarkup(
      <PackageScreen registry="npm" name={rankedPackage.name} pkg={rankedPackage} jsonLd={[{}]} />,
    );
    const page = text(html);

    expect(html).toContain('data-follow="package-page" data-label="react-resize-detector"');
    expect(html).toContain('data-updates="react-resize-detector" data-repository="acme/react-resize-detector"');
    expect(html.indexOf('data-follow')).toBeLessThan(html.indexOf('data-updates'));
    expect(hrefs(html)).toContain('https://www.npmjs.com/package/react-resize-detector');
    expect(html).toContain('aria-label="Open on npm"');
    for (const fact of [
      'npm package',
      'acme/react-resize-detector 12.3.0 · 125 releases First published Nov 19, 2015 octo-dev, mona MIT license',
      'Ranks on npm Beta All ranks #1,234 ↑6 Downloads #40 Dependents’ stars #230 ↓2 Dependents',
      '1,797,999 in the week to Nov 16',
      '1,381 downloads a week per GitHub star of its repository',
      'Used by 16 repositories with 100+ stars 16,429 stars between them · direct dependents, in their own package.json Hide archived',
      'notea-org/notea Archived',
      'package.json +2',
      '1–2 of 16',
      'last read Nov 16, 2026. How we count',
      'Downloads by week 77.9 million in the last 12 months',
      'Weekly downloads from npm, Nov 17, 2025 – Nov 16, 2026.',
      'About react-resize-detector react-resize-detector is an npm package downloaded',
      'Downloads from npm through Nov 16, 2026 · Dependents read Nov 16, 2026, next read Dec 1, 2026',
    ]) {
      expect(page, fact).toContain(fact);
    }
    expect(page).not.toContain('Registry');
    expect(page.indexOf('Used by')).toBeLessThan(page.indexOf('Downloads by week'));
    expect(page.lastIndexOf('About react-resize-detector')).toBeGreaterThan(page.indexOf('How we count'));
    expect(headers(html)).toEqual(['#', 'Repository', 'Declared in', 'Version', 'Stars']);
    expect(hrefs(html)).toEqual(
      expect.arrayContaining([
        '/packages/npm/downloads/13',
        '/packages/npm/dependents-stars/1',
        '/packages/npm/dependents/3',
        '/packages/npm/downloads/1',
        '/methodology/packages',
      ]),
    );
    expect(html).toContain(
      'data-chart="Weekly downloads from npm, Nov 17, 2025 – Nov 16, 2026: 77.9 million in the last 12 months"',
    );
    expect(html).toContain('application/ld+json');
  });

  it('draws an unranked package nobody with 100+ stars uses, a scoped name and a repository without a page', () => {
    const html = renderToStaticMarkup(<PackageScreen registry="npm" name={quietPackage.name} pkg={quietPackage} />);
    const page = text(html);

    expect(page).toContain('@nebula/ ui');
    expect(page).not.toContain('Ranks on npm');
    expect(page).toContain('nebula/ui 12.3.0');
    expect(hrefs(html)).not.toContain('/repo/nebula/ui');
    expect(page).toContain('a, b, c, d, e and 4 more');
    expect(page).toContain(
      'Used by No repository with 100+ stars uses @nebula/ui directly yet We read every repository with 100+ stars once a month; the next read is on December 1, 2026. Follow to hear when one starts using it.',
    );
    expect(html).toContain('data-follow="used-by-empty" data-label="@nebula/ui"');
    expect(page).not.toContain('downloads a week per GitHub star');
    expect(html).not.toContain('<table');
  });

  it('draws a package nobody has read yet: its name, Refresh and one empty state, without Follow', () => {
    const html = renderToStaticMarkup(
      <PackageScreen registry="npm" name={notReadPackage.name} pkg={{ ...notReadPackage, refreshRunning: true }} />,
    );
    const page = text(html);

    expect(page).toContain('left-pad-next npm package');
    expect(page).toContain('We have not read this package yet');
    expect(html).toContain('data-running="true"');
    expect(html).not.toContain('data-follow');
    expect(page).not.toContain('Ranks on');
    expect(page).not.toContain('About left-pad-next');
  });

  it('says only that package data is unavailable, with no button', () => {
    const html = renderToStaticMarkup(<PackageScreen registry="npm" name="@nebula/ui" pkg="unavailable" />);

    expect(text(html)).toContain('Package data is not available right now. Try again in a few minutes.');
    expect(html).not.toContain('data-updates');
    expect(html).not.toContain('data-follow');
  });

  it('hands the button its daily updates', () => {
    const html = renderToStaticMarkup(
      <PackageScreen
        registry="npm"
        name={rankedPackage.name}
        pkg={{ ...rankedPackage, dailyUpdates: onBadge, deprecated: 'Use x' }}
      />,
    );
    expect(text(html)).toContain('Deprecated: Use x');
  });
});
